-- ========================================================================
-- MTP RH : GESTION DES REPORTS DE SOLDE ANNUEL
-- Conforme au Code du Travail Marocain (Dahir n° 1-03-194)
-- ========================================================================
-- Articles de référence :
-- Art. 231 : Droit au congé annuel (1.5j/mois = 18j/an)
-- Art. 241 : Majoration d'ancienneté (+1.5j tous les 5 ans, max 30j)
-- Art. 242 : Report des congés non pris (conditions et limites)
-- Art. 243 : Délai de conservation des documents (5 ans minimum)
-- ========================================================================

-- 1. TABLE DES REPORTS ANNUELS
-- Enregistre les reports de solde d'une année sur l'autre
CREATE TABLE IF NOT EXISTS public.annual_carryovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Période de référence
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    
    -- Calculs de solde (en jours ouvrables)
    accrued_days NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (accrued_days >= 0),
    used_days NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (used_days >= 0),
    remaining_days NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (remaining_days >= 0),
    
    -- Report de l'année précédente
    previous_carryover NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (previous_carryover >= 0),
    
    -- Report vers l'année suivante (calculé automatiquement)
    next_carryover NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (next_carryover >= 0),
    
    -- Limite légale de report (Art. 242 : généralement 1/3 du droit annuel)
    max_carryover_allowed NUMERIC(6,2) NOT NULL DEFAULT 6,
    
    -- Jours perdus (non reportables au-delà de la limite)
    forfeited_days NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (forfeited_days >= 0),
    
    -- Statut de validation
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'VALIDATED', 'LOCKED')),
    
    -- Validation administrative
    validated_by UUID REFERENCES public.profiles(id),
    validated_at TIMESTAMPTZ,
    
    -- Notes et justifications
    admin_notes TEXT,
    calculation_details JSONB DEFAULT '{}'::jsonb,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte d'unicité : un seul enregistrement par utilisateur et par année
    UNIQUE(user_id, year)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_carryovers_user_year ON public.annual_carryovers(user_id, year);
CREATE INDEX IF NOT EXISTS idx_carryovers_status ON public.annual_carryovers(status);
CREATE INDEX IF NOT EXISTS idx_carryovers_year ON public.annual_carryovers(year);

-- 2. TABLE D'HISTORIQUE DES CONGÉS
-- Enregistrement détaillé de tous les congés pour calculs et audits
CREATE TABLE IF NOT EXISTS public.leave_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
    
    -- Détails du congé
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration NUMERIC(6,2) NOT NULL CHECK (duration > 0),
    
    -- Statut et validation
    status TEXT NOT NULL,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Année fiscale d'imputation
    fiscal_year INTEGER NOT NULL,
    
    -- Impact sur le solde
    balance_before NUMERIC(6,2),
    balance_after NUMERIC(6,2),
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Commentaires
    comment TEXT,
    manager_comment TEXT
);

-- Index pour optimiser les requêtes d'historique
CREATE INDEX IF NOT EXISTS idx_leave_history_user ON public.leave_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_history_fiscal_year ON public.leave_history(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_leave_history_dates ON public.leave_history(start_date, end_date);

-- 3. TABLE D'AUDIT TRAIL DÉTAILLÉ
-- Extension de la table audit_logs pour les modifications de reports
CREATE TABLE IF NOT EXISTS public.carryover_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carryover_id UUID REFERENCES public.annual_carryovers(id) ON DELETE CASCADE,
    
    -- Action effectuée
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'VALIDATE', 'LOCK', 'RECALCULATE', 'ADJUST')),
    
    -- Qui a effectué l'action
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    
    -- Données avant/après modification
    old_values JSONB,
    new_values JSONB,
    
    -- Justification
    reason TEXT,
    
    -- Métadonnées
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'audit trail
CREATE INDEX IF NOT EXISTS idx_carryover_audit_carryover ON public.carryover_audit(carryover_id);
CREATE INDEX IF NOT EXISTS idx_carryover_audit_date ON public.carryover_audit(created_at);

-- 4. TABLE DES RÈGLES DE CALCUL
-- Configuration des règles de calcul par département ou catégorie
CREATE TABLE IF NOT EXISTS public.carryover_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Applicabilité
    department TEXT,
    role TEXT,
    is_default BOOLEAN DEFAULT false,
    
    -- Règles de calcul
    annual_base_days NUMERIC(4,2) NOT NULL DEFAULT 18 CHECK (annual_base_days > 0),
    seniority_bonus_days NUMERIC(4,2) NOT NULL DEFAULT 1.5 CHECK (seniority_bonus_days >= 0),
    seniority_bonus_years INTEGER NOT NULL DEFAULT 5 CHECK (seniority_bonus_years > 0),
    max_annual_days NUMERIC(4,2) NOT NULL DEFAULT 30 CHECK (max_annual_days > 0),
    
    -- Règles de report
    max_carryover_ratio NUMERIC(3,2) NOT NULL DEFAULT 0.33 CHECK (max_carryover_ratio >= 0 AND max_carryover_ratio <= 1),
    carryover_expiry_months INTEGER NOT NULL DEFAULT 3 CHECK (carryover_expiry_months >= 0),
    
    -- Métadonnées
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Notes réglementaires
    legal_reference TEXT,
    notes TEXT
);

-- Insérer la règle par défaut conforme au Code du Travail Marocain
INSERT INTO public.carryover_rules (
    is_default, 
    annual_base_days, 
    seniority_bonus_days, 
    seniority_bonus_years,
    max_annual_days,
    max_carryover_ratio,
    carryover_expiry_months,
    legal_reference,
    notes
) VALUES (
    true,
    18,
    1.5,
    5,
    30,
    0.33,
    3,
    'Code du Travail Marocain - Dahir n° 1-03-194 (Art. 231, 241, 242)',
    'Règle standard : 18 jours de base + 1.5j/5ans (max 30j). Report limité à 1/3 du droit annuel, à utiliser dans les 3 mois.'
) ON CONFLICT DO NOTHING;

-- 5. FONCTION DE MISE À JOUR AUTOMATIQUE DU TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_carryovers_updated_at ON public.annual_carryovers;
CREATE TRIGGER update_carryovers_updated_at
    BEFORE UPDATE ON public.annual_carryovers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. FONCTION DE CALCUL AUTOMATIQUE DES REPORTS
CREATE OR REPLACE FUNCTION calculate_carryover(
    p_user_id UUID,
    p_year INTEGER
) RETURNS TABLE (
    accrued NUMERIC,
    used NUMERIC,
    remaining NUMERIC,
    previous_carry NUMERIC,
    next_carry NUMERIC,
    max_carry NUMERIC,
    forfeited NUMERIC
) AS $$
DECLARE
    v_hire_date DATE;
    v_years_of_service NUMERIC;
    v_annual_rate NUMERIC;
    v_previous_carryover NUMERIC;
    v_used_days NUMERIC;
    v_max_carryover NUMERIC;
BEGIN
    -- Récupérer la date d'embauche
    SELECT hire_date INTO v_hire_date
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF v_hire_date IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé ou date d''embauche manquante';
    END IF;
    
    -- Calculer l'ancienneté au 31 décembre de l'année concernée
    v_years_of_service := EXTRACT(YEAR FROM AGE(
        DATE(p_year || '-12-31'),
        v_hire_date
    ));
    
    -- Calculer le taux annuel selon l'ancienneté (Art. 231 et 241)
    v_annual_rate := LEAST(18 + (FLOOR(v_years_of_service / 5) * 1.5), 30);
    
    -- Récupérer le report de l'année précédente
    SELECT COALESCE(next_carryover, 0) INTO v_previous_carryover
    FROM public.annual_carryovers
    WHERE user_id = p_user_id AND year = p_year - 1;
    
    IF v_previous_carryover IS NULL THEN
        v_previous_carryover := 0;
    END IF;
    
    -- Calculer les jours utilisés dans l'année
    SELECT COALESCE(SUM(duration), 0) INTO v_used_days
    FROM public.leave_history
    WHERE user_id = p_user_id 
    AND fiscal_year = p_year
    AND status = 'APPROVED'
    AND leave_type = 'ANNUAL';
    
    -- Limite de report (1/3 du droit annuel selon Art. 242)
    v_max_carryover := ROUND(v_annual_rate / 3, 2);
    
    -- Retourner les résultats
    RETURN QUERY SELECT
        v_annual_rate AS accrued,
        v_used_days AS used,
        GREATEST(0, v_annual_rate + v_previous_carryover - v_used_days) AS remaining,
        v_previous_carryover AS previous_carry,
        LEAST(
            GREATEST(0, v_annual_rate + v_previous_carryover - v_used_days),
            v_max_carryover
        ) AS next_carry,
        v_max_carryover AS max_carry,
        GREATEST(0, 
            (v_annual_rate + v_previous_carryover - v_used_days) - v_max_carryover
        ) AS forfeited;
END;
$$ LANGUAGE plpgsql;

-- 7. SÉCURITÉ RLS (Row Level Security)
ALTER TABLE public.annual_carryovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carryover_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carryover_rules ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (simplifiées pour la démo)
CREATE POLICY "carryovers_policy" ON public.annual_carryovers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "leave_history_policy" ON public.leave_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "carryover_audit_policy" ON public.carryover_audit FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "carryover_rules_policy" ON public.carryover_rules FOR ALL USING (true) WITH CHECK (true);

-- 8. VUES UTILES POUR LES RAPPORTS

-- Vue consolidée des soldes par employé
CREATE OR REPLACE VIEW v_employee_balances AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.department,
    p.hire_date,
    ac.year,
    ac.accrued_days,
    ac.used_days,
    ac.remaining_days,
    ac.previous_carryover,
    ac.next_carryover,
    ac.forfeited_days,
    ac.status,
    ac.validated_at,
    ac.validated_by
FROM public.profiles p
LEFT JOIN public.annual_carryovers ac ON p.id = ac.user_id
WHERE p.is_active = true
ORDER BY p.full_name, ac.year DESC;

-- Vue des reports en attente de validation
CREATE OR REPLACE VIEW v_pending_carryovers AS
SELECT 
    ac.*,
    p.full_name,
    p.email,
    p.department,
    p.hire_date
FROM public.annual_carryovers ac
JOIN public.profiles p ON ac.user_id = p.id
WHERE ac.status IN ('DRAFT', 'PENDING')
ORDER BY ac.year DESC, p.full_name;

-- 9. COMMENTAIRES POUR LA DOCUMENTATION
COMMENT ON TABLE public.annual_carryovers IS 'Gestion des reports de solde annuel conformément au Code du Travail Marocain';
COMMENT ON TABLE public.leave_history IS 'Historique complet des congés pour calculs et audits réglementaires';
COMMENT ON TABLE public.carryover_audit IS 'Audit trail de toutes les modifications des reports (conservation 5 ans minimum)';
COMMENT ON TABLE public.carryover_rules IS 'Règles de calcul configurables par département/catégorie';

COMMENT ON COLUMN public.annual_carryovers.accrued_days IS 'Jours acquis dans l''année (Art. 231 : 1.5j/mois)';
COMMENT ON COLUMN public.annual_carryovers.max_carryover_allowed IS 'Limite de report (Art. 242 : généralement 1/3 du droit annuel)';
COMMENT ON COLUMN public.annual_carryovers.forfeited_days IS 'Jours perdus car dépassant la limite de report';

-- FIN DU SCRIPT
