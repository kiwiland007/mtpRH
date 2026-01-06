-- Script de migration pour ajouter la clé étrangère manquante
-- À exécuter si vous avez déjà des données dans la base

-- Supprimer la contrainte si elle existe déjà avec un autre nom
DO $$ 
BEGIN
    -- Supprimer toutes les contraintes de clé étrangère existantes sur user_id
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'leave_requests' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

-- Vérifier et nettoyer les données orphelines (user_id qui n'existent pas dans profiles)
DELETE FROM public.leave_requests 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Ajouter la clé étrangère
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leave_requests_user_id_fkey' 
        AND table_name = 'leave_requests'
    ) THEN
        ALTER TABLE public.leave_requests 
        ADD CONSTRAINT leave_requests_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Vérification
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'leave_requests';


