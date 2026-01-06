
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
  email: 'ahmed.mansouri@entreprise.ma',
  fullName: 'Ahmed Mansouri',
  role: UserRole.ADMIN,
  department: 'Direction',
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
      console.error('Erreur de chargement:', error);
      if (error.message === "SCHEMA_MISSING") {
        setDbError("La structure de la base de données est incomplète ou verrouillée par d'anciennes politiques.");
      } else {
        setDbError(`Erreur technique : ${error.message || 'Problème de communication avec Supabase'}`);
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
      const { error } = await supabase
        .from('leave_requests')
        .insert([newReqData]);

      if (error) throw error;
      setNotifications([`Demande de congé envoyée avec succès`, ...notifications]);
      fetchRequests();
    } catch (error: any) {
      setNotifications([`Erreur lors de l'envoi : ${error.message}`, ...notifications]);
    }
    setActiveTab('dashboard');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser.role} />
      
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Header user={currentUser} onLogout={() => alert('Déconnexion simulée...')} />
        
        <main className="p-6 md:p-10 lg:p-12">
          <div className="max-w-7xl mx-auto">
            {dbError && (
              <div className="mb-10 bg-white border-l-4 border-rose-500 shadow-2xl rounded-r-3xl p-8 animate-in overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L19.5 19h-15L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                </div>
                <div className="flex items-start gap-6">
                  <div className="bg-rose-100 p-4 rounded-2xl text-rose-600 shrink-0">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">Initialisation Nécessaire (Code 42710)</h3>
                    <p className="text-slate-600 mt-2 leading-relaxed max-w-2xl">
                      Supabase détecte des conflits de sécurité. Copiez le script ci-dessous pour effectuer un <strong>nettoyage total</strong> et une <strong>réinstallation propre</strong> de l'intranet.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <button 
                        onClick={() => {
                          const sql = `-- NETTOYAGE EXHAUSTIF DES ANCIENNES POLITIQUES
DROP POLICY IF EXISTS "Enable all access for all users" ON public.leave_requests;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public Access Requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Public Access Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "v2_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "v2_full_access_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "app_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "app_full_access_requests" ON public.leave_requests;

-- RECRÉATION DES TABLES
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

-- RÉACTIVATION RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- NOUVELLES POLITIQUES UNIFIÉES V3
CREATE POLICY "app_v3_access_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "app_v3_access_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

-- INSERTION ADMIN PAR DÉFAUT
INSERT INTO public.profiles (id, full_name, email, role, department, hire_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ahmed Mansouri', 'ahmed.mansouri@entreprise.ma', 'ADMIN', 'Direction', '2020-03-10')
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';`;
                          navigator.clipboard.writeText(sql);
                          setNotifications(["Script V3 (Nettoyage Complet) copié ! Collez-le dans votre SQL Editor.", ...notifications]);
                        }}
                        className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                      >
                        Copier le script de nettoyage V3
                      </button>
                      <button 
                        onClick={() => fetchRequests()}
                        className="bg-white text-slate-900 border-2 border-slate-100 px-8 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Rafraîchir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[60vh] space-y-8">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center">
                   <p className="text-slate-900 font-bold text-lg">Synchronisation avec les serveurs RH</p>
                   <p className="text-slate-400 text-sm mt-1">Conformité Code du Travail Marocain...</p>
                </div>
              </div>
            ) : (
              <div className="animate-in">
                {activeTab === 'dashboard' && <Dashboard user={currentUser} requests={requests} />}
                {activeTab === 'request' && <LeaveForm onSubmit={handleNewRequest} />}
                {activeTab === 'calendar' && <TeamCalendar requests={requests} />}
                {activeTab === 'admin' && <AdminPanel />}
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
