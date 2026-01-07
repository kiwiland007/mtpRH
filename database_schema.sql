-- MTP RH : SCRIPT D'INSTALLATION COMPLET V5.3 (MODERN & SECURE)
-- Ce script initialise la base de données avec toutes les colonnes nécessaires pour la hiérarchie et l'admin root modifiable.

-- 1. Nettoyage des anciennes politiques (optionnel mais recommandé pour éviter les conflits)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "mtprh_v4_profiles" ON public.profiles;
    DROP POLICY IF EXISTS "mtprh_v4_requests" ON public.leave_requests;
    DROP POLICY IF EXISTS "mtprh_v5_profiles" ON public.profiles;
    DROP POLICY IF EXISTS "mtprh_v5_requests" ON public.leave_requests;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 2. Création / Mise à jour de la table PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN')),
    department TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    balance_adjustment NUMERIC DEFAULT 0,
    preferences JSONB DEFAULT '{"email_notifications": true, "app_notifications": true, "theme": "light"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la table existe déjà, on ajoute les colonnes manquantes une par une
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance_adjustment NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"email_notifications": true, "app_notifications": true, "theme": "light"}'::jsonb;

-- 3. Création / Mise à jour de la table LEAVE_REQUESTS
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    duration NUMERIC NOT NULL,
    comment TEXT,
    manager_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Création de la table AUDIT_LOGS pour la traçabilité
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sécurité RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques simplifiées pour la démo (À restreindre en production réelle)
CREATE POLICY "mtprh_v5_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mtprh_v5_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mtprh_v5_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Initialisation du compte Administrateur Principal
-- Note: Ce compte est maintenant un profil normal et modifiable.
INSERT INTO public.profiles (id, full_name, email, role, department, hire_date, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ahmed Mansouri', 'ahmed.mansouri@mtp.ma', 'ADMIN', 'Direction Générale', '2020-03-10', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'ADMIN',
    is_active = true;
