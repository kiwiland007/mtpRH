
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, LeaveStatus, LeaveType } from './types';
import Dashboard from './components/Dashboard';
import LeaveForm from './components/LeaveForm';
import Sidebar from './components/Sidebar';
import TeamCalendar from './components/TeamCalendar';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import NotificationCenter from './components/NotificationCenter';
import { supabase } from './lib/supabase';

const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'ahmed.mansouri@mtp.ma',
  fullName: 'Ahmed Mansouri',
  role: UserRole.ADMIN,
  department: 'Direction Générale',
  hireDate: '2020-03-10',
  managerId: 'admin-root'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'request' | 'calendar' | 'admin'>('dashboard');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const fetchRequests = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found') || error.code === '42P01') {
          throw new Error("SCHEMA_MISSING");
        }
        throw error;
      }

      const mappedData: LeaveRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        type: item.type as LeaveType,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status as LeaveStatus,
        duration: Number(item.duration),
        comment: item.comment,
        managerComment: item.manager_comment,
        createdAt: item.created_at
      }));

      setRequests(mappedData);
    } catch (error: any) {
      console.error('Erreur SQL:', error);
      if (error.message === "SCHEMA_MISSING") {
        setDbError("Configuration de base de données manquante.");
      } else {
        setDbError(`Erreur technique : ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = async (formData: any) => {
    const newReqData = {
      user_id: currentUser.id,
      type: formData.type,
      start_date: formData.startDate,
      end_date: formData.endDate,
      status: LeaveStatus.PENDING,
      duration: formData.duration,
      comment: formData.comment
    };

    try {
      const { error } = await supabase.from('leave_requests').insert([newReqData]);
      if (error) throw error;
      setNotifications([`Demande transmise avec succès`, ...notifications]);
      fetchRequests();
      setActiveTab('dashboard');
    } catch (error: any) {
      setNotifications([`Erreur : ${error.message}`, ...notifications]);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser.role} />
      
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Header user={currentUser} onLogout={() => alert('Session fermée.')} />
        
        <main className="p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            {dbError && (
              <div className="mb-10 bg-white border-2 border-rose-100 shadow-2xl shadow-rose-100/50 rounded-[2.5rem] p-10 animate-in relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    Alerte Configuration
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Initialisation de mtpRH</h3>
                  <p className="text-slate-500 leading-relaxed text-lg max-w-2xl mb-8">
                    Le schéma de données n'est pas encore prêt. Copiez ce script SQL et exécutez-le dans votre console Supabase pour activer la plateforme.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => {
                        const sql = `-- MTP RH : SCRIPT D'INSTALLATION V4 (CLEAN & INSTALL)
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
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';`;
                        navigator.clipboard.writeText(sql);
                        setNotifications(["Script d'installation mtpRH copié !", ...notifications]);
                      }}
                      className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                      Copier le script SQL d'installation
                    </button>
                    <button onClick={() => fetchRequests()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all">
                      Actualiser mtpRH
                    </button>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 opacity-5">
                   <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L19.5 19h-15L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-tighter">Chargement de votre espace mtpRH...</p>
              </div>
            ) : (
              <div className="animate-in">
                {activeTab === 'dashboard' && <Dashboard user={currentUser} requests={requests} />}
                {activeTab === 'request' && <LeaveForm onSubmit={handleNewRequest} />}
                {activeTab === 'calendar' && <TeamCalendar requests={requests} />}
                {activeTab === 'admin' && <AdminPanel onUpdate={() => fetchRequests()} />}
              </div>
            )}
          </div>
        </main>
      </div>
      <NotificationCenter notifications={notifications} />
    </div>
  );
};

export default App;
