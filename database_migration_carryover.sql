-- ========================================================================
-- MIGRATION : SYNCHRONISATION DE L'HISTORIQUE DES CONGÉS
-- ========================================================================
-- Ce script migre les données existantes de leave_requests vers leave_history
-- et initialise les reports de solde pour tous les employés actifs
-- ========================================================================

-- 1. MIGRATION DE L'HISTORIQUE DES CONGÉS
-- ========================================================================

INSERT INTO public.leave_history (
    user_id,
    leave_request_id,
    leave_type,
    start_date,
    end_date,
    duration,
    status,
    approved_by,
    approved_at,
    fiscal_year,
    created_at,
    comment,
    manager_comment
)
SELECT 
    lr.user_id,
    lr.id AS leave_request_id,
    lr.type AS leave_type,
    lr.start_date,
    lr.end_date,
    lr.duration,
    lr.status,
    NULL AS approved_by,  -- À compléter manuellement si disponible
    CASE 
        WHEN lr.status = 'APPROVED' THEN lr.created_at
        ELSE NULL
    END AS approved_at,
    EXTRACT(YEAR FROM lr.start_date)::INTEGER AS fiscal_year,
    lr.created_at,
    lr.comment,
    lr.manager_comment
FROM public.leave_requests lr
WHERE NOT EXISTS (
    -- Éviter les doublons si le script est exécuté plusieurs fois
    SELECT 1 FROM public.leave_history lh
    WHERE lh.leave_request_id = lr.id
)
ORDER BY lr.created_at;

-- Afficher le résultat de la migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM public.leave_history;
    RAISE NOTICE 'Migration terminée : % enregistrements dans leave_history', migrated_count;
END $$;

-- 2. INITIALISATION DES REPORTS POUR L'ANNÉE EN COURS
-- ========================================================================

DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    employee_record RECORD;
    calc_result RECORD;
    inserted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Initialisation des reports pour l''année %', current_year;
    
    -- Pour chaque employé actif
    FOR employee_record IN 
        SELECT id, full_name, hire_date 
        FROM public.profiles 
        WHERE is_active = true
    LOOP
        BEGIN
            -- Calculer le report pour l'année en cours
            SELECT * INTO calc_result
            FROM calculate_carryover(employee_record.id, current_year);
            
            -- Insérer ou mettre à jour le report
            INSERT INTO public.annual_carryovers (
                user_id,
                year,
                accrued_days,
                used_days,
                remaining_days,
                previous_carryover,
                next_carryover,
                max_carryover_allowed,
                forfeited_days,
                status,
                calculation_details
            ) VALUES (
                employee_record.id,
                current_year,
                calc_result.accrued,
                calc_result.used,
                calc_result.remaining,
                calc_result.previous_carry,
                calc_result.next_carry,
                calc_result.max_carry,
                calc_result.forfeited,
                'PENDING',
                jsonb_build_object(
                    'calculatedAt', NOW(),
                    'method', 'automatic_migration',
                    'employeeName', employee_record.full_name
                )
            )
            ON CONFLICT (user_id, year) 
            DO UPDATE SET
                accrued_days = EXCLUDED.accrued_days,
                used_days = EXCLUDED.used_days,
                remaining_days = EXCLUDED.remaining_days,
                previous_carryover = EXCLUDED.previous_carryover,
                next_carryover = EXCLUDED.next_carryover,
                max_carryover_allowed = EXCLUDED.max_carryover_allowed,
                forfeited_days = EXCLUDED.forfeited_days,
                calculation_details = EXCLUDED.calculation_details,
                updated_at = NOW();
            
            inserted_count := inserted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Erreur pour employé % (%) : %', 
                employee_record.full_name, 
                employee_record.id, 
                SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Initialisation terminée : % réussis, % erreurs', inserted_count, error_count;
END $$;

-- 3. INITIALISATION DES REPORTS POUR L'ANNÉE PRÉCÉDENTE
-- ========================================================================
-- Utile pour avoir un historique et calculer les reports N-1

DO $$
DECLARE
    previous_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE) - 1;
    employee_record RECORD;
    calc_result RECORD;
    inserted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Initialisation des reports pour l''année %', previous_year;
    
    FOR employee_record IN 
        SELECT id, full_name, hire_date 
        FROM public.profiles 
        WHERE is_active = true
        AND hire_date < DATE(previous_year || '-12-31')
    LOOP
        BEGIN
            SELECT * INTO calc_result
            FROM calculate_carryover(employee_record.id, previous_year);
            
            INSERT INTO public.annual_carryovers (
                user_id,
                year,
                accrued_days,
                used_days,
                remaining_days,
                previous_carryover,
                next_carryover,
                max_carryover_allowed,
                forfeited_days,
                status,
                calculation_details
            ) VALUES (
                employee_record.id,
                previous_year,
                calc_result.accrued,
                calc_result.used,
                calc_result.remaining,
                calc_result.previous_carry,
                calc_result.next_carry,
                calc_result.max_carry,
                calc_result.forfeited,
                'VALIDATED',  -- Année précédente = déjà validée
                jsonb_build_object(
                    'calculatedAt', NOW(),
                    'method', 'automatic_migration',
                    'employeeName', employee_record.full_name,
                    'note', 'Année précédente - auto-validée lors de la migration'
                )
            )
            ON CONFLICT (user_id, year) DO NOTHING;
            
            inserted_count := inserted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Erreur pour employé % (%) : %', 
                employee_record.full_name, 
                employee_record.id, 
                SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Initialisation terminée : % réussis, % erreurs', inserted_count, error_count;
END $$;

-- 4. CRÉATION D'UN TRIGGER POUR SYNCHRONISATION AUTOMATIQUE
-- ========================================================================
-- Chaque fois qu'une demande de congé est approuvée, l'ajouter à l'historique

CREATE OR REPLACE FUNCTION sync_leave_to_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la demande vient d'être approuvée
    IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
        INSERT INTO public.leave_history (
            user_id,
            leave_request_id,
            leave_type,
            start_date,
            end_date,
            duration,
            status,
            approved_at,
            fiscal_year,
            created_at,
            comment,
            manager_comment
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.type,
            NEW.start_date,
            NEW.end_date,
            NEW.duration,
            NEW.status,
            NOW(),
            EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
            NEW.created_at,
            NEW.comment,
            NEW.manager_comment
        )
        ON CONFLICT (leave_request_id) 
        DO UPDATE SET
            status = EXCLUDED.status,
            approved_at = EXCLUDED.approved_at,
            manager_comment = EXCLUDED.manager_comment;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_leave_history ON public.leave_requests;
CREATE TRIGGER trigger_sync_leave_history
    AFTER INSERT OR UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_leave_to_history();

-- 5. VÉRIFICATION ET STATISTIQUES
-- ========================================================================

DO $$
DECLARE
    total_employees INTEGER;
    total_carryovers INTEGER;
    total_history INTEGER;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    rec RECORD;  -- Déclaration de la variable pour la boucle
BEGIN
    SELECT COUNT(*) INTO total_employees FROM public.profiles WHERE is_active = true;
    SELECT COUNT(*) INTO total_carryovers FROM public.annual_carryovers;
    SELECT COUNT(*) INTO total_history FROM public.leave_history;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STATISTIQUES DE MIGRATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Employés actifs : %', total_employees;
    RAISE NOTICE 'Reports créés : %', total_carryovers;
    RAISE NOTICE 'Historique congés : %', total_history;
    RAISE NOTICE '';
    
    -- Détails par année
    FOR rec IN 
        SELECT year, COUNT(*) as count, 
               SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) as validated
        FROM public.annual_carryovers
        GROUP BY year
        ORDER BY year DESC
    LOOP
        RAISE NOTICE 'Année % : % reports (% validés)', rec.year, rec.count, rec.validated;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Migration terminée avec succès !';
    RAISE NOTICE '========================================';
END $$;

-- 6. REQUÊTES DE VÉRIFICATION UTILES
-- ========================================================================

-- Vérifier les employés sans report pour l'année en cours
SELECT p.full_name, p.email, p.hire_date
FROM public.profiles p
LEFT JOIN public.annual_carryovers ac ON p.id = ac.user_id 
    AND ac.year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.is_active = true
AND ac.id IS NULL;

-- Vérifier les incohérences dans les calculs
SELECT 
    ac.*,
    p.full_name,
    (ac.accrued_days + ac.previous_carryover - ac.used_days) as calculated_remaining
FROM public.annual_carryovers ac
JOIN public.profiles p ON ac.user_id = p.id
WHERE ABS(ac.remaining_days - (ac.accrued_days + ac.previous_carryover - ac.used_days)) > 0.01;

-- Vérifier les reports qui dépassent la limite
SELECT 
    p.full_name,
    ac.year,
    ac.next_carryover,
    ac.max_carryover_allowed,
    ac.forfeited_days
FROM public.annual_carryovers ac
JOIN public.profiles p ON ac.user_id = p.id
WHERE ac.next_carryover > ac.max_carryover_allowed;

-- FIN DE LA MIGRATION
