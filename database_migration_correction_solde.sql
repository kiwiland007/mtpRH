-- Migration : Ajout de l'ajustement du solde consommé
-- Permet de corriger les erreurs de saisie sur le solde consommé

-- 1. Ajout de la colonne d'ajustement
ALTER TABLE public.annual_carryovers 
ADD COLUMN IF NOT EXISTS used_days_adjustment NUMERIC(6,2) DEFAULT 0;

-- 2. Mise à jour de la vue consolidée pour inclure l'ajustement
CREATE OR REPLACE VIEW v_employee_balances AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.department,
    p.hire_date,
    ac.year,
    ac.accrued_days,
    ac.used_days,
    ac.used_days_adjustment,
    (ac.used_days + ac.used_days_adjustment) as total_used_days,
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

-- 3. Mise à jour de la fonction de calcul pour prendre en compte l'ajustement si on l'appelle
-- Note: L'ajustement est généralement géré au niveau applicatif lors du recalcul
-- mais on peut l'intégrer ici pour que les calculs DB soient cohérents.
CREATE OR REPLACE FUNCTION calculate_carryover(
    p_user_id UUID,
    p_year INTEGER
) RETURNS TABLE (
    accrued NUMERIC,
    used NUMERIC,
    used_adj NUMERIC,
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
    v_used_days_adjustment NUMERIC;
    v_max_carryover NUMERIC;
    v_total_used NUMERIC;
BEGIN
    -- Récupérer la date d'embauche
    SELECT hire_date INTO v_hire_date
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF v_hire_date IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé ou date d''embauche manquante';
    END IF;
    
    -- Récupérer l'ajustement existant s'il y en a un
    SELECT COALESCE(used_days_adjustment, 0) INTO v_used_days_adjustment
    FROM public.annual_carryovers
    WHERE user_id = p_user_id AND year = p_year;
    
    IF v_used_days_adjustment IS NULL THEN v_used_days_adjustment := 0; END IF;

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
    
    -- Calculer les jours utilisés dans l'année (depuis l'historique)
    SELECT COALESCE(SUM(duration), 0) INTO v_used_days
    FROM public.leave_history
    WHERE user_id = p_user_id 
    AND fiscal_year = p_year
    AND status = 'APPROVED'
    AND leave_type = 'ANNUAL';
    
    v_total_used := v_used_days + v_used_days_adjustment;

    -- Limite de report (1/3 du droit annuel selon Art. 242)
    v_max_carryover := ROUND(v_annual_rate / 3, 2);
    
    -- Retourner les résultats
    RETURN QUERY SELECT
        v_annual_rate AS accrued,
        v_used_days AS used,
        v_used_days_adjustment AS used_adj,
        GREATEST(0, v_annual_rate + v_previous_carryover - v_total_used) AS remaining,
        v_previous_carryover AS previous_carry,
        LEAST(
            GREATEST(0, v_annual_rate + v_previous_carryover - v_total_used),
            v_max_carryover
        ) AS next_carry,
        v_max_carryover AS max_carry,
        GREATEST(0, 
            (v_annual_rate + v_previous_carryover - v_total_used) - v_max_carryover
        ) AS forfeited;
END;
$$ LANGUAGE plpgsql;
