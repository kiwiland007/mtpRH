
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, LeaveStatus, LeaveType } from './types';
import Dashboard from './components/Dashboard';
import LeaveForm from './components/LeaveForm';
import Sidebar from './components/Sidebar';
import TeamCalendar from './components/TeamCalendar';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import NotificationCenter from './components/NotificationCenter';
import LoginScreen from './components/LoginScreen';
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
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'request' | 'calendar' | 'admin'>('dashboard');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportTicket, setSupportTicket] = useState({ subject: '', message: '' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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
        duration: Number(item.duration) || 0,
        comment: item.comment || '',
        managerComment: item.manager_comment || '',
        createdAt: item.created_at
      }));

      // Filtrer les requêtes de l'utilisateur actuel pour le dashboard
      // Mais garder toutes pour l'admin
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
    if (!currentUser) return;

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
      addNotification(`Demande transmise avec succès`);
      fetchRequests();
      setActiveTab('dashboard');
    } catch (error: any) {
      addNotification(`Erreur : ${error.message}`);
    }
  };

  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev]);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    addNotification(`Bienvenue ${user.fullName} !`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setNotifications([]);
    // Réinitialiser les modals
    setShowProfileModal(false);
    setShowSettingsModal(false);
    setShowLogoutModal(false);
    setShowSupportModal(false);
  };

  // Fonction disponible pour mise à jour future du profil
  // Actuellement le modal affiche seulement les informations en lecture
  const handleUpdateProfile = async (updatedUser: Partial<User>) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedUser.fullName,
          email: updatedUser.email,
          department: updatedUser.department
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser({ ...currentUser, ...updatedUser });
      addNotification('Profil mis à jour avec succès');
      setShowProfileModal(false);
    } catch (error: any) {
      addNotification(`Erreur lors de la mise à jour : ${error.message}`);
    }
  };

  // Afficher l'écran de connexion si l'utilisateur n'est pas authentifié
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser?.role || 'EMPLOYEE'} onOpenSupport={() => setShowSupportModal(true)} />

      <div className="flex flex-col flex-1 overflow-y-auto">
        <Header
          user={currentUser!}
          onLogout={() => setShowLogoutModal(true)}
          onShowProfile={() => setShowProfileModal(true)}
          onShowSettings={() => setShowSettingsModal(true)}
        />

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

-- Clé étrangère (si la table existe déjà sans contrainte)
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

-- Mises à jour v5 (Administration Avancée)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance_adjustment NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"email_notifications": true, "app_notifications": true}'::jsonb;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_view_logs" ON public.audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "admin_insert_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Vue pour les reports de solde (simulation)
CREATE OR REPLACE VIEW public.leave_balance_reports AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.hire_date,
    (EXTRACT(YEAR FROM age(NOW(), p.hire_date)) * 18) as theoretical_total,
    COALESCE(SUM(lr.duration) FILTER (WHERE lr.status = 'APPROVED'), 0) as total_consumed
FROM public.profiles p
LEFT JOIN public.leave_requests lr ON p.id = lr.user_id
GROUP BY p.id;`;
                        navigator.clipboard.writeText(sql);
                        addNotification("Script d'installation mtpRH copié !");
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
                  <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L19.5 19h-15L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
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
                {activeTab === 'request' && <LeaveForm onSubmit={handleNewRequest} onNotification={addNotification} />}
                {activeTab === 'calendar' && <TeamCalendar requests={requests} />}
                {activeTab === 'admin' && <AdminPanel user={currentUser} onUpdate={() => fetchRequests()} onNotification={addNotification} />}
              </div>
            )}
          </div>
        </main>
      </div>
      <NotificationCenter notifications={notifications} />

      {/* Modal Mon Profil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-900 text-white rounded-[2rem] flex items-center justify-center text-2xl font-black">
                  {currentUser?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Mon Profil</h3>
                  <p className="text-slate-400 font-medium italic">{currentUser?.role || 'EMPLOYEE'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateProfile({
                fullName: formData.get('fullName') as string,
                department: formData.get('department') as string,
                // Email is generally not editable by user for security/identity reasons, but we allow it if requested
                email: formData.get('email') as string
              });
            }} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nom Complet</label>
                <input
                  name="fullName"
                  defaultValue={currentUser?.fullName}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={currentUser?.email}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Département</label>
                <select
                  name="department"
                  defaultValue={currentUser?.department}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none"
                >
                  {['Direction', 'Sinistre', 'Production', 'Opérations', 'Finance', 'RH', 'Direction Générale'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Date d'embauche</label>
                <div className="bg-slate-100 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-500 cursor-not-allowed">
                  {currentUser?.hireDate ? new Date(currentUser.hireDate).toLocaleDateString('fr-FR') : 'N/A'} (Non modifiable)
                </div>
              </div>
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-indigo-900">Ancienneté</span>
                  <span className="text-lg font-black text-indigo-600">
                    {currentUser?.hireDate ? Math.floor((new Date().getTime() - new Date(currentUser.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' ans' : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowProfileModal(false)} className="px-6 py-3 text-slate-500 font-bold rounded-2xl hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-8 py-3 bg-indigo-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paramètres */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Paramètres</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-black text-slate-900 mb-4">Préférences de notification</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Notifications par email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Notifications de nouvelles demandes</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Rappels de congés</span>
                  </label>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-black text-slate-900 mb-4">Informations système</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Version</span>
                    <span className="font-bold text-slate-900">mtpRH v4.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base de données</span>
                    <span className="font-bold text-slate-900">Supabase</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conformité légale</span>
                    <span className="font-bold text-emerald-600">Code du Travail Marocain</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  addNotification('Paramètres sauvegardés');
                  setShowSettingsModal(false);
                }}
                className="w-full bg-indigo-900 text-white py-6 rounded-[2rem] font-black text-sm shadow-xl hover:bg-black transition-all"
              >
                Enregistrer les paramètres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl animate-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Déconnexion</h3>
              <p className="text-slate-500 text-sm">Êtes-vous sûr de vouloir fermer votre session ?</p>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                disabled={isLoggingOut}
                onClick={() => {
                  if (!isLoggingOut) {
                    setShowLogoutModal(false);
                    setIsLoggingOut(false);
                  }
                }}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                disabled={isLoggingOut}
                onClick={() => {
                  setIsLoggingOut(true);
                  addNotification('Session fermée avec succès');
                  setShowLogoutModal(false);
                  setTimeout(() => {
                    handleLogout();
                  }, 500);
                }}
                className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoggingOut && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Support / Ticket */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Support Technique</h3>
                <p className="text-slate-400 text-sm mt-2">Ouvrir un ticket de support</p>
              </div>
              <button
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportTicket({ subject: '', message: '' });
                }}
                className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!supportTicket.subject.trim() || !supportTicket.message.trim()) {
                  addNotification('Veuillez remplir tous les champs');
                  return;
                }
                addNotification(`Ticket créé : "${supportTicket.subject}"`);
                setShowSupportModal(false);
                setSupportTicket({ subject: '', message: '' });
              }}
              className="space-y-6"
            >
              <div>
                <label className="text-sm font-black text-slate-700 block mb-2">Sujet du ticket</label>
                <input
                  type="text"
                  required
                  value={supportTicket.subject}
                  onChange={(e) => setSupportTicket({ ...supportTicket, subject: e.target.value })}
                  placeholder="Ex: Problème de connexion, Question sur les congés..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-black text-slate-700 block mb-2">Description du problème</label>
                <textarea
                  rows={6}
                  required
                  value={supportTicket.message}
                  onChange={(e) => setSupportTicket({ ...supportTicket, message: e.target.value })}
                  placeholder="Décrivez votre problème en détail..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-medium focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-indigo-800">
                    <p className="font-bold mb-1">Informations de contact</p>
                    <p className="text-xs">Email : {currentUser?.email || 'N/A'}</p>
                    <p className="text-xs">Département : {currentUser?.department || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupportModal(false);
                    setSupportTicket({ subject: '', message: '' });
                  }}
                  className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all"
                >
                  Envoyer le ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
