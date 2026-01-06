-- MTP RH : SCRIPT D'INSTALLATION V4 (CLEAN & INSTALL)
-- Suppression exhaustive pour éviter l'erreur 42710
DROP POLICY IF EXISTS "Enable all access for all users" ON public.leave_requests;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public Access Requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Public Access Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "v2_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "v2_full_access_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "app_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "app_full_access_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "app_v3_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "app_v3_access_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "mtprh_v4_profiles" ON public.profiles;
DROP POLICY IF EXISTS "mtprh_v4_requests" ON public.leave_requests;

-- Création robuste
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN')),
    department TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    duration NUMERIC NOT NULL,
    comment TEXT,
    manager_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sécurité RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Politiques v4 (Uniques)
CREATE POLICY "mtprh_v4_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mtprh_v4_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

-- Admin
INSERT INTO public.profiles (id, full_name, email, role, department, hire_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ahmed Mansouri', 'ahmed.mansouri@mtp.ma', 'ADMIN', 'Direction', '2020-03-10')
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';
