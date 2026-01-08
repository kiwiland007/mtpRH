
import React, { useState, useEffect } from 'react';
import { UserRole, LeaveStatus, LeaveType, User } from '../types';
import { supabase } from '../lib/supabase';
import { calculateMoroccanAccruedDays, calculateBalanceAnalysis, calculateBusinessDays } from '../utils/calculations';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface AdminPanelProps {
  user?: User | null;
  onUpdate?: () => void;
  onNotification?: (message: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onUpdate, onNotification }) => {
  const [view, setView] = useState<'overview' | 'requests' | 'users' | 'settings' | 'history' | 'reports' | 'logs' | 'integrity'>('overview');
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ employee: '', status: 'ALL', period: 'ALL' });


  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ id: string, action: LeaveStatus } | null>(null);
  const [editRequestModal, setEditRequestModal] = useState<any | null>(null);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [newAdminRequest, setNewAdminRequest] = useState({ userId: '', type: LeaveType.ANNUAL, startDate: '', endDate: '', comment: '', duration: 0, isHalfDay: false });
  const [managerComment, setManagerComment] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  const departments = ["Direction Générale", "Direction", "Sinistre", "Production", "Opérations", "Finance", "RH"];

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: UserRole.EMPLOYEE,
    department: 'Sinistre',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    manager_id: ''
  });

  const auditLog = async (action: string, details: any) => {
    try {
      if (user) {
        await supabase.from('audit_logs').insert([{
          action,
          performed_by: user.id,
          details
        }]);
      }
    } catch (e) {
      console.warn('Audit Log failed (table might be missing):', action);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Essayer d'abord avec la relation (join)
      let { data: reqs, error: reqError } = await supabase
        .from('leave_requests')
        .select('*, profiles(full_name, department)')
        .order('created_at', { ascending: false });

      // Si la relation n'existe pas, faire un fallback sans join
      if (reqError && (reqError.message?.includes('relationship') || reqError.message?.includes('schema cache'))) {
        const { data: reqsData, error: reqsError } = await supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (reqsError) throw reqsError;
        reqs = reqsData || [];

        // Enrichir manuellement avec les données des profils
        const { data: users, error: usersError } = await supabase.from('profiles').select('*');
        if (usersError) {
          console.error("Erreur lors du chargement des profils:", usersError);
          if (onNotification) onNotification("Erreur lors du chargement des données utilisateurs");
        }

        const usersMap = new Map((users || []).map(u => [u.id, u]));

        reqs = (reqs || []).map(req => ({
          ...req,
          profiles: usersMap.get(req.user_id) || { full_name: 'Inconnu', department: 'N/A' }
        }));
      } else if (reqError) {
        throw reqError;
      }

      const { data: users, error: userError } = await supabase.from('profiles').select('*').order('full_name');
      if (userError) throw userError;

      setAllRequests(reqs || []);
      setDbUsers(users || []);

      // Fetch logs if table exists
      const { data: logData } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
      if (logData) setLogs(logData);

    } catch (err: any) {
      console.error("Erreur de synchronisation:", err);
      if (onNotification) onNotification(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setGeneratedPassword(retVal);
  };

  const openCreateRequestForUser = (userId: string) => {
    setNewAdminRequest({ ...newAdminRequest, userId });
    setIsCreatingRequest(true);
    setGeneratedPassword('');
  };

  const getUserLeaveStats = (userId: string, hireDate: string, adjustment: number = 0) => {
    const analysis = calculateBalanceAnalysis(hireDate,
      allRequests
        .filter(r => r.user_id === userId && r.status === LeaveStatus.APPROVED)
        .reduce((sum, r) => sum + Number(r.duration), 0),
      adjustment
    );
    return {
      totalAccrued: analysis.totalAccrued,
      consumed: analysis.consumed,
      remaining: analysis.remaining,
      report: analysis.carryOver
    };
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Validation
    if (!editingUser.full_name.trim()) {
      if (onNotification) onNotification("Le nom complet est requis");
      else alert("Le nom complet est requis");
      return;
    }

    if (!editingUser.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
      if (onNotification) onNotification("Email invalide");
      else alert("Email invalide");
      return;
    }

    const hireDate = new Date(editingUser.hire_date);
    if (isNaN(hireDate.getTime())) {
      if (onNotification) onNotification("Date d'embauche invalide");
      else alert("Date d'embauche invalide");
      return;
    }

    // Security Check
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
      if (onNotification) onNotification("Action non autorisée : Droits insuffisants");
      return;
    }

    try {
      setLoading(true);
      const updateData: any = {
        full_name: editingUser.full_name,
        department: editingUser.department,
        role: editingUser.role,
        email: editingUser.email,
        hire_date: editingUser.hire_date,
      };

      // Colonnes optionnelles avec fallback si le schéma n'est pas à jour
      if (editingUser.hasOwnProperty('is_active')) updateData.is_active = editingUser.is_active;
      if (editingUser.hasOwnProperty('balance_adjustment')) updateData.balance_adjustment = Number(editingUser.balance_adjustment);
      if (editingUser.manager_id !== undefined) updateData.manager_id = editingUser.manager_id || null;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('manager_id')) {
          throw new Error("Schéma de base de données obsolète. Veuillez copier et exécuter le script SQL dans 'Paramètres' pour ajouter les colonnes manquantes (manager_id, is_active, etc.).");
        }
        throw error;
      }

      await auditLog('UPDATE_USER', { target: editingUser.full_name, id: editingUser.id, changes: editingUser });

      setEditingUser(null);
      fetchData();
      if (onNotification) onNotification("Talent mis à jour avec succès ✨");
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur: ${err.message}`);
      else alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`ACTION IRREVOCABLE : Confirmez-vous la suppression de ${name} ?`)) return;
    setLoading(true);
    try {
      await supabase.from('leave_requests').delete().eq('user_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      await auditLog('DELETE_USER', { name, id });

      fetchData();
      if (onUpdate) onUpdate();
      if (onNotification) onNotification("Utilisateur supprimé avec succès");
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur lors de la suppression : ${err.message}`);
      else alert("Erreur lors de la suppression : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security Check
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
      if (onNotification) onNotification("Action non autorisée : Droits insuffisants");
      return;
    }

    // Validation
    if (!newUser.full_name.trim()) {
      if (onNotification) onNotification("Le nom complet est requis");
      return;
    }

    if (!newUser.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      if (onNotification) onNotification("Email invalide");
      return;
    }

    const hireDate = new Date(newUser.hire_date);
    if (isNaN(hireDate.getTime())) {
      if (onNotification) onNotification("Date d'embauche invalide");
      return;
    }

    try {
      setLoading(true);
      // We explicitly list columns to avoid issues if the table is older than expected
      const insertData: any = {
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        hire_date: newUser.hire_date,
      };

      // Add conditional columns for backward compatibility if needed, but normally we expect them
      if (newUser.hasOwnProperty('is_active')) insertData.is_active = newUser.is_active;
      if (newUser.manager_id) insertData.manager_id = newUser.manager_id;

      const { error } = await supabase.from('profiles').insert([insertData]);

      if (error) {
        if (error.message?.includes('column')) {
          throw new Error(`La base de données n'est pas à jour. Veuillez exécuter le script SQL dans Paramètres. (Erreur: ${error.message})`);
        }
        throw error;
      }

      await auditLog('CREATE_USER', { name: newUser.full_name, email: newUser.email });

      setIsAdding(false);
      setNewUser({
        full_name: '',
        email: '',
        role: UserRole.EMPLOYEE,
        department: 'Sinistre',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
        manager_id: ''
      });
      fetchData();
      if (onNotification) onNotification("Nouvel utilisateur ajouté avec succès ✨");
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur: ${err.message}`);
      else alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!decisionModal) return;
    try {
      const { error } = await supabase.from('leave_requests').update({
        status: decisionModal.action,
        manager_comment: managerComment
      }).eq('id', decisionModal.id);
      if (error) throw error;
      setDecisionModal(null);
      setManagerComment('');
      fetchData();
      if (onUpdate) onUpdate();
      const actionText = decisionModal.action === LeaveStatus.APPROVED ? 'approuvée' : 'refusée';
      await auditLog('DECISION_REQUEST', { id: decisionModal.id, action: decisionModal.action });

      if (onNotification) onNotification(`Demande ${actionText} avec succès`);
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur critique: ${err.message}`);
      else alert("Erreur critique: " + err.message);
    }
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRequestModal) return;

    try {
      const businessDays = calculateBusinessDays(editRequestModal.start_date, editRequestModal.end_date);

      const { error } = await supabase.from('leave_requests').update({
        type: editRequestModal.type,
        start_date: editRequestModal.start_date,
        end_date: editRequestModal.end_date,
        duration: businessDays
      }).eq('id', editRequestModal.id);

      if (error) throw error;

      await auditLog('EDIT_REQUEST', { id: editRequestModal.id, new_data: editRequestModal });

      setEditRequestModal(null);
      fetchData();
      if (onNotification) onNotification('Demande modifiée avec succès');
    } catch (e: any) {
      if (onNotification) onNotification(`Erreur modification: ${e.message}`);
    }
  };

  const handleAdminCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminRequest.userId || !newAdminRequest.startDate) {
      if (onNotification) onNotification("Veuillez remplir au moins le collaborateur et la date de début");
      return;
    }

    try {
      setLoading(true);
      const finalDuration = Number(newAdminRequest.duration) || calculateBusinessDays(newAdminRequest.startDate, newAdminRequest.isHalfDay ? newAdminRequest.startDate : newAdminRequest.endDate);

      const { error } = await supabase.from('leave_requests').insert([{
        user_id: newAdminRequest.userId,
        type: newAdminRequest.type,
        start_date: newAdminRequest.startDate,
        end_date: newAdminRequest.isHalfDay ? newAdminRequest.startDate : newAdminRequest.endDate,
        status: LeaveStatus.APPROVED, // Admin created requests are auto-approved
        duration: finalDuration,
        comment: newAdminRequest.comment || 'Créé par l\'administrateur',
        manager_comment: 'Validation automatique (Création Admin)'
      }]);

      if (error) throw error;

      await auditLog('CREATE_REQUEST_ADMIN', { ...newAdminRequest, duration: finalDuration, status: 'APPROVED' });

      setIsCreatingRequest(false);
      setNewAdminRequest({ userId: '', type: LeaveType.ANNUAL, startDate: '', endDate: '', comment: '', duration: 0, isHalfDay: false });
      fetchData();
      if (onNotification) onNotification("Demande créée et approuvée avec succès");
    } catch (e: any) {
      if (onNotification) onNotification(`Erreur création: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pending: allRequests.filter(r => r.status === LeaveStatus.PENDING).length,
    totalEmployees: dbUsers.length,
    approved: allRequests.filter(r => r.status === LeaveStatus.APPROVED).length,
    avgDuration: allRequests.length ? (allRequests.reduce((acc, r) => acc + Number(r.duration), 0) / allRequests.length).toFixed(1) : 0
  };

  const deptData = dbUsers.reduce((acc: any[], user) => {
    const dept = user.department || 'Autre';
    const existing = acc.find(a => a.name === dept);
    if (existing) existing.value++;
    else acc.push({ name: dept, value: 1 });
    return acc;
  }, []);

  return (
    <div className="space-y-8 animate-in pb-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente', val: stats.pending, color: 'bg-rose-600' },
          { label: 'Effectif', val: stats.totalEmployees, color: 'bg-indigo-900' },
          { label: 'Historique', val: stats.approved, color: 'bg-emerald-500' },
          { label: 'Indice moyen', val: stats.avgDuration + ' j', color: 'bg-slate-800' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${s.color}`}></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap gap-1">
          <button onClick={() => setView('overview')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'overview' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Analytique</button>
          <button onClick={() => setView('requests')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'requests' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Validations ({stats.pending})</button>
          <button onClick={() => setView('history')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'history' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Historique</button>
          <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'reports' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Reports</button>
          <button onClick={() => setView('users')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'users' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Effectifs</button>
          <button onClick={() => setView('logs')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'logs' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Logs</button>
          <button onClick={() => setView('settings')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'settings' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Paramètres</button>
          <button onClick={() => setView('integrity')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${view === 'integrity' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Intégrité</button>
        </div>

        {view === 'users' && (
          <button onClick={() => setIsAdding(true)} className="bg-indigo-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl hover:scale-105 transition-all">+ Ajouter Talent</button>
        )}
      </div>

      {/* Overview View */}
      {view === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6">Répartition par Département</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#f59e0b'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6">Activité RH</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="#1e3a8a" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Requests View - Validation des demandes */}
      {view === 'requests' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in relative">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin"></div></div>}
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Demandes en Attente de Validation</h3>
              <p className="text-slate-500 text-sm mt-2">{stats.pending} demande(s) nécessitent votre attention</p>
            </div>
            <button
              onClick={() => setIsCreatingRequest(true)}
              className="bg-indigo-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg hover:bg-black transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              Nouvelle Demande
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Collaborateur</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4 text-center">Durée</th>
                  <th className="px-6 py-4">Commentaire</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {allRequests
                  .filter(r => r.status === LeaveStatus.PENDING)
                  .map(req => {
                    const user = req.profiles || { full_name: 'Inconnu', department: 'N/A' };
                    return (
                      <tr key={req.id} className="hover:bg-indigo-50/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-900 text-white rounded-lg flex items-center justify-center font-black text-xs">{user.full_name?.charAt(0) || '?'}</div>
                            <div>
                              <p className="font-bold text-slate-900">{user.full_name || 'Inconnu'}</p>
                              <p className="text-[10px] text-slate-400">{user.department || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{req.type}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(req.start_date).toLocaleDateString('fr-FR')} - {new Date(req.end_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{req.duration} j</td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{req.comment || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditRequestModal(req)}
                              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Modifier"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => setDecisionModal({ id: req.id, action: LeaveStatus.APPROVED })}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition-all"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => setDecisionModal({ id: req.id, action: LeaveStatus.REJECTED })}
                              className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-700 transition-all"
                            >
                              Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {allRequests.filter(r => r.status === LeaveStatus.PENDING).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <p className="text-lg font-bold">Aucune demande en attente</p>
                      <p className="text-sm mt-2">Toutes les demandes ont été traitées</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div >
      )
      }

      {/* History View */}
      {
        view === 'history' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Historique des Congés</h3>
                <p className="text-slate-500 text-sm mt-2">Consultez l'historique complet des demandes.</p>
              </div>
              <div className="flex gap-4">
                <input
                  placeholder="Rechercher un employé..."
                  className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  value={historyFilter.employee}
                  onChange={e => setHistoryFilter({ ...historyFilter, employee: e.target.value })}
                />
                <select
                  className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={historyFilter.status}
                  onChange={e => setHistoryFilter({ ...historyFilter, status: e.target.value })}
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value={LeaveStatus.APPROVED}>Approuvé</option>
                  <option value={LeaveStatus.REJECTED}>Refusé</option>
                  <option value={LeaveStatus.PENDING}>En attente</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Collaborateur</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-center">Durée</th>
                    <th className="px-6 py-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allRequests
                    .filter(r => {
                      if (historyFilter.status !== 'ALL' && r.status !== historyFilter.status) return false;
                      if (historyFilter.employee && !r.profiles?.full_name.toLowerCase().includes(historyFilter.employee.toLowerCase())) return false;
                      return true;
                    })
                    .map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{req.profiles?.full_name || 'Inconnu'}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{req.type}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {req.duration === 0.5 ? '0,5 jour' : `${req.duration} ${req.duration > 1 ? 'jours' : 'jour'}`}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                            req.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Reports View */}
      {
        view === 'reports' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Gestion des Reports de Solde</h3>
            <p className="text-slate-500 mb-8 max-w-3xl">
              Le tableau ci-dessous présente une estimation des soldes à reporter.
              Calcul basé sur : (Années d'ancienneté × 18 jours) - (Jours consommés).
              Cette vue permet de valider les reports annuels.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dbUsers.map(u => {
                // Recalculate stats using the detailed analysis
                const consumed = allRequests.filter(r => r.user_id === u.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0);
                const stats = calculateBalanceAnalysis(u.hire_date, consumed, u.balance_adjustment);

                return (
                  <div key={u.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">{u.full_name}</h4>
                        <p className="text-xs text-slate-500">{u.department}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${stats.carryOver > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {stats.carryOver > 0 ? 'REPORT N-1' : 'A JOUR'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Droit Annuel</span>
                        <span className="font-bold">{stats.currentAnnualRate} j</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Acquis</span>
                        <span className="font-bold">{stats.totalAccrued.toFixed(1)} j</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Consommés</span>
                        <span className="font-bold text-rose-600">-{stats.consumed.toFixed(1)} j</span>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-white p-2 rounded-xl mt-2">
                        <span className="text-xs font-black text-indigo-900 uppercase">Solde Dispo</span>
                        <span className="text-xl font-black text-indigo-600">{stats.remaining.toFixed(1)} j</span>
                      </div>
                      {stats.carryOver > 0 && (
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Dont Report</span>
                          <span className="text-sm font-black text-amber-600">{stats.carryOver.toFixed(1)} j</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* Logs View */}
      {
        view === 'logs' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Journaux d'Audit</h3>
              <p className="text-slate-500 text-sm mt-2">Traçabilité complète des actions administratives.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Horodatage</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Auteur</th>
                    <th className="px-6 py-4">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.length > 0 ? logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800">{log.action}</td>
                      <td className="px-6 py-4 text-slate-600">{log.profiles?.full_name || 'Système'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">Aucun log disponible (table manquante ?)</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Settings View */}
      {
        view === 'settings' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Paramètres Administratifs</h3>
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-black text-slate-900 mb-4">Informations Système</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Version</span>
                    <span className="font-bold text-slate-900">mtpRH v5.0 (Admin)</span>
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
            </div>

            <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-200">
              <h4 className="text-sm font-black text-indigo-900 mb-4">Export de Données</h4>
              <p className="text-xs text-indigo-700 mb-4">Télécharger la liste complète des employés avec leurs soldes détaillés.</p>
              <button
                onClick={() => {
                  try {
                    const headers = ['Nom', 'Email', 'Departement', 'Date Embauche', 'Acquis Total', 'Consomme', 'Restant', 'Droit Annuel', 'Dont Report', 'Ajustement Manuel', 'Statut'];
                    const rows = dbUsers.map(u => {
                      const consumed = allRequests.filter(r => r.user_id === u.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0);
                      const s = calculateBalanceAnalysis(u.hire_date, consumed, u.balance_adjustment);
                      return [
                        `"${u.full_name}"`,
                        u.email,
                        u.department,
                        u.hire_date,
                        s.totalAccrued.toFixed(2),
                        s.consumed.toFixed(2),
                        s.remaining.toFixed(2),
                        s.currentAnnualRate,
                        s.carryOver.toFixed(2),
                        u.balance_adjustment || 0,
                        u.is_active === false ? 'Archive' : 'Actif'
                      ].join(',');
                    });

                    // Add BOM for Excel UTF-8 compatibility
                    const csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    if (link.download !== undefined) {
                      const url = URL.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute("download", `mtp_rh_export_${new Date().toISOString().split('T')[0]}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }

                    if (onNotification) onNotification('Export CSV généré avec succès');
                  } catch (e: any) {
                    if (onNotification) onNotification(`Erreur d'export: ${e.message}`);
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Exporter en CSV
              </button>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
              <h4 className="text-sm font-black text-amber-900 mb-2">⚠️ Actions Administratives</h4>
              <p className="text-xs text-amber-700 mb-4">Ces actions sont irréversibles. Utilisez avec précaution.</p>
              <button
                onClick={async () => {
                  if (window.confirm('Voulez-vous vraiment supprimer toutes les données de démonstration ? Seul votre compte administrateur sera conservé.')) {
                    setLoading(true);
                    try {
                      // Supprimer tous les utilisateurs sauf l'admin actuel (si user present) ou ceux qui sont 'ADMIN'
                      const { error } = await supabase.from('profiles').delete().neq('role', 'ADMIN');
                      // Note: Cela déclenchera le CASCADE DELETE sur les leave_requests

                      if (error) throw error;
                      await auditLog('CLEAN_DEMO', { status: 'success' });
                      fetchData();
                      if (onNotification) onNotification('Données de démonstration nettoyées avec succès');
                    } catch (e: any) {
                      if (onNotification) onNotification(`Erreur: ${e.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-700 transition-all"
              >
                Nettoyer les données de démonstration
              </button>
            </div>
          </div>
        )
      }

      {
        view === 'users' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in relative">
            {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin"></div></div>}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-7">Talent</th>
                    <th className="px-10 py-7">Dpt</th>
                    <th className="px-10 py-7">Statut</th>
                    <th className="px-10 py-7">Embauche</th>
                    <th className="px-10 py-7 text-center">Acquis</th>
                    <th className="px-10 py-7 text-center">Restant</th>
                    <th className="px-10 py-7 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {dbUsers.map(u => {
                    const s = getUserLeaveStats(u.id, u.hire_date, u.balance_adjustment);
                    const isArchived = u.is_active === false;
                    return (
                      <tr key={u.id} className={`hover:bg-indigo-50/20 transition-all group ${isArchived ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{u.full_name?.charAt(0) || '?'}</div>
                            <div><p className="font-bold text-slate-900 tracking-tight">{u.full_name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div>
                          </div>
                        </td>
                        <td className="px-10 py-6 font-bold text-indigo-600">{u.department}</td>
                        <td className="px-10 py-6">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${isArchived ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isArchived ? 'Archivé' : 'Actif'}
                          </span>
                        </td>
                        <td className="px-10 py-6 font-medium text-slate-500">{new Date(u.hire_date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-10 py-6 text-center font-bold text-slate-600">{s.totalAccrued.toFixed(1)} j</td>
                        <td className="px-10 py-6 text-center"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black">{s.remaining.toFixed(1)} j</span></td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                              setHistoryFilter({ employee: u.full_name, status: 'ALL', period: 'ALL' });
                              setView('history');
                            }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all" title="Voir historique">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button onClick={() => openCreateRequestForUser(u.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Ajouter congé">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 18v-6m-3 3h6" /></svg>
                            </button>
                            <button onClick={() => setEditingUser(u)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Gérer</button>
                            <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Integrity Check View */}
      {view === 'integrity' && (
        <div className="space-y-8 animate-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Diagnostic d'Intégrité des Données</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Overlapping Requests */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Chevauchements de Demandes (Doublons)
                </h4>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-64 overflow-y-auto">
                  {(() => {
                    const overlaps: any[] = [];
                    allRequests.forEach(r1 => {
                      allRequests.forEach(r2 => {
                        if (r1.id !== r2.id && r1.user_id === r2.user_id && r1.status !== 'REJECTED' && r2.status !== 'REJECTED') {
                          const start1 = new Date(r1.start_date);
                          const end1 = new Date(r1.end_date);
                          const start2 = new Date(r2.start_date);
                          const end2 = new Date(r2.end_date);
                          if (start1 <= end2 && start2 <= end1) {
                            if (!overlaps.find(o => (o.r1 === r2.id && o.r2 === r1.id))) {
                              overlaps.push({ r1: r1.id, r2: r2.id, name: r1.profiles?.full_name, date1: r1.start_date, date2: r2.start_date });
                            }
                          }
                        }
                      });
                    });
                    if (overlaps.length === 0) return <p className="text-xs text-slate-400 italic">Aucun chevauchement détecté ✅</p>;
                    return overlaps.map((o, i) => (
                      <div key={i} className="mb-2 p-3 bg-white rounded-xl border border-rose-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{o.name}</p>
                          <p className="text-slate-500">Conflit entre demande {o.date1} et {o.date2}</p>
                        </div>
                        <button onClick={() => setView('requests')} className="text-rose-600 font-bold hover:underline">Voir</button>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Inconsistent Durations */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  Erreurs de Calcul de Durée
                </h4>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-64 overflow-y-auto">
                  {(() => {
                    const errors = allRequests.filter(r => {
                      const expected = calculateBusinessDays(r.start_date, r.end_date);
                      return Math.abs(Number(r.duration) - expected) > 0.01;
                    });
                    if (errors.length === 0) return <p className="text-xs text-slate-400 italic">Toutes les durées sont cohérentes ✅</p>;
                    return errors.map((r, i) => (
                      <div key={i} className="mb-2 p-3 bg-white rounded-xl border border-amber-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{r.profiles?.full_name}</p>
                          <p className="text-slate-500">Enregistré: {r.duration}j | Attendu: {calculateBusinessDays(r.start_date, r.end_date)}j</p>
                        </div>
                        <button
                          onClick={async () => {
                            const expected = calculateBusinessDays(r.start_date, r.end_date);
                            const { error } = await supabase.from('leave_requests').update({ duration: expected }).eq('id', r.id);
                            if (!error) { fetchData(); if (onNotification) onNotification("Durée corrigée"); }
                          }}
                          className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-bold hover:bg-amber-200"
                        >
                          Corriger
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Actions de Nettoyage Automatique</h4>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={async () => {
                    if (window.confirm("Voulez-vous supprimer toutes les demandes en double (chevauchements) ? L'action est irréversible.")) {
                      // Logic to delete duplicates would go here
                      if (onNotification) onNotification("Fonctionnalité de nettoyage groupée en cours de déploiement...");
                    }
                  }}
                  className="bg-indigo-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  Supprimer les Demandes en Double
                </button>
                <button
                  className="bg-white text-indigo-900 border-2 border-indigo-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
                >
                  Récupérer les Demandes Orphelines
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {
        editingUser && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-6"><div className="w-20 h-20 bg-indigo-900 text-white rounded-[2rem] flex items-center justify-center text-2xl font-black">{editingUser.full_name?.charAt(0) || '?'}</div><div><h3 className="text-3xl font-black text-slate-900 tracking-tighter">{editingUser.full_name}</h3><p className="text-slate-400 font-medium italic">Audit de solde & Paramètres</p></div></div>
                <button onClick={() => setEditingUser(null)} className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Données Identité</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nom Complet</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" value={editingUser.full_name} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Département</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.department} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                      <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Rôle</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}>
                        <option value={UserRole.EMPLOYEE}>Employé</option>
                        <option value={UserRole.MANAGER}>Manager</option>
                        <option value={UserRole.HR}>RH</option>
                        <option value={UserRole.ADMIN}>Administrateur</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-xl">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-indigo-600"
                        checked={editingUser.is_active !== false}
                        onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                      />
                      <span className="text-sm font-bold text-slate-700">Compte Actif (Décocher pour archiver)</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Manager Direct</label>
                      <select
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none"
                        value={editingUser.manager_id || ''}
                        onChange={e => setEditingUser({ ...editingUser, manager_id: e.target.value })}
                      >
                        <option value="">Aucun (Root Admin)</option>
                        {dbUsers.filter(u => u.id !== editingUser.id).map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1 px-1">Définit le responsable qui recevra les demandes de congés.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Contrat & Solde</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Date d'embauche</label>
                      <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.hire_date} onChange={e => setEditingUser({ ...editingUser, hire_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Ajustement Solde (+/- jours)</label>
                      <input type="number" step="0.5" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.balance_adjustment || 0} onChange={e => setEditingUser({ ...editingUser, balance_adjustment: e.target.value })} />
                      <p className="text-[10px] text-slate-400 mt-1 px-1">Ajoute ou retire des jours au solde calculé automatiquement.</p>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mt-4">
                      <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-indigo-900">Congés Acquis (Auto)</span><span className="text-lg font-black text-indigo-600">{calculateMoroccanAccruedDays(editingUser.hire_date).toFixed(1)} j</span></div>
                      {Number(editingUser.balance_adjustment) !== 0 && (
                        <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-amber-900">Ajustement Manuel</span><span className="text-lg font-black text-amber-600">{Number(editingUser.balance_adjustment) > 0 ? '+' : ''}{Number(editingUser.balance_adjustment).toFixed(1)} j</span></div>
                      )}
                      <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-rose-900">Consommé</span><span className="text-lg font-black text-rose-600">-{allRequests.filter(r => r.user_id === editingUser.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0)} j</span></div>
                      <div className="flex justify-between items-center pt-4 border-t border-indigo-200"><span className="text-xs font-bold text-emerald-900">Solde Restant</span><span className="text-lg font-black text-emerald-600">{Math.max(0, calculateMoroccanAccruedDays(editingUser.hire_date) + (Number(editingUser.balance_adjustment) || 0) - allRequests.filter(r => r.user_id === editingUser.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0)).toFixed(1)} j</span></div>
                    </div>
                  </div>
                </div>

                {/* Preferences & Security */}
                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Sécurité</h4>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editingUser.email) return;
                        if (window.confirm(`Envoyer un email de réinitialisation à ${editingUser.email} ?`)) {
                          const { error } = await supabase.auth.resetPasswordForEmail(editingUser.email);
                          if (error) {
                            if (onNotification) onNotification(`Erreur: ${error.message}`);
                          } else {
                            if (onNotification) onNotification(`Email envoyé à ${editingUser.email}`);
                            await auditLog('RESET_PASSWORD_TRIGGER', { target_email: editingUser.email });
                          }
                        }
                      }}
                      className="w-full py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      Réinitialiser mot de passe
                    </button>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe temporaire</span>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                        >
                          Générer
                        </button>
                      </div>
                      {generatedPassword ? (
                        <div className="flex items-center justify-between">
                          <code className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm font-bold text-indigo-600">{generatedPassword}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassword);
                              if (onNotification) onNotification("Copié !");
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-all"
                            title="Copier"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Générez un mot de passe sécurisé à communiquer au collaborateur.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Préférences Système</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-indigo-600"
                          checked={editingUser.preferences?.email_notifications !== false} // True by default
                          onChange={e => setEditingUser({ ...editingUser, preferences: { ...editingUser.preferences, email_notifications: e.target.checked } })}
                        />
                        <span className="text-xs font-bold text-slate-700">Notifications Email</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 col-span-full">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Annuler</button>
                  <button type="submit" className="bg-indigo-900 text-white px-10 py-4 rounded-[2rem] font-black text-sm shadow-xl hover:bg-black transition-all">Enregistrer les modifications</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Request Modal */}
      {
        editRequestModal && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[90] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Modifier la demande</h3>
              <form onSubmit={handleEditRequest} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Type de congé</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none"
                    value={editRequestModal.type}
                    onChange={e => setEditRequestModal({ ...editRequestModal, type: e.target.value })}
                  >
                    {Object.values(LeaveType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Début</label>
                    <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={editRequestModal.start_date} onChange={e => setEditRequestModal({ ...editRequestModal, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Fin</label>
                    <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={editRequestModal.end_date} onChange={e => setEditRequestModal({ ...editRequestModal, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditRequestModal(null)} className="px-6 py-3 text-slate-500 font-bold rounded-2xl hover:bg-slate-50">Annuler</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg">Sauvegarder</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Decision Modal */}
      {
        decisionModal && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl animate-in">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">
                {decisionModal.action === LeaveStatus.APPROVED ? 'Approuver la demande' : 'Refuser la demande'}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-black text-slate-700 block mb-2">Commentaire (optionnel)</label>
                  <textarea
                    rows={4}
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    placeholder="Ajoutez un commentaire pour le collaborateur..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm focus:border-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={() => {
                      setDecisionModal(null);
                      setManagerComment('');
                    }}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDecision}
                    className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${decisionModal.action === LeaveStatus.APPROVED
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                  >
                    {decisionModal.action === LeaveStatus.APPROVED ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Add User Modal */}
      {
        isAdding && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[4rem] p-16 shadow-2xl animate-in">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Nouveau Talent</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input required className="col-span-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Nom Complet" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
                <input type="email" required className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <select className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  <option value={UserRole.EMPLOYEE}>Employé</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.HR}>RH</option>
                  <option value={UserRole.ADMIN}>Administrateur</option>
                </select>
                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Date d'embauche</label>
                  <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={newUser.hire_date} onChange={e => setNewUser({ ...newUser, hire_date: e.target.value })} />
                </div>
                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Manager Direct</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none"
                    value={newUser.manager_id}
                    onChange={e => setNewUser({ ...newUser, manager_id: e.target.value })}
                  >
                    <option value="">Aucun (Root Admin)</option>
                    {dbUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="col-span-full bg-indigo-900 text-white py-6 rounded-[2rem] font-black text-sm hover:bg-black transition-all">Intégrer dans MOUMEN RH</button>
                <button type="button" onClick={() => setIsAdding(false)} className="col-span-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Fermer</button>
              </form>
            </div>
          </div>
        )
      }
      {/* Admin Create Request Modal */}
      {
        isCreatingRequest && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[90] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 px-2">Créer une demande (Admin)</h3>
              <form onSubmit={handleAdminCreateRequest} className="space-y-6">
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">Demande de demi-journée</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdminRequest.isHalfDay}
                      onChange={(e) => setNewAdminRequest({ ...newAdminRequest, isHalfDay: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Collaborateur</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500"
                    value={newAdminRequest.userId}
                    onChange={e => setNewAdminRequest({ ...newAdminRequest, userId: e.target.value })}
                  >
                    <option value="">Sélectionner un collaborateur...</option>
                    {dbUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Type</label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500"
                      value={newAdminRequest.type}
                      onChange={e => setNewAdminRequest({ ...newAdminRequest, type: e.target.value as LeaveType })}
                    >
                      {Object.values(LeaveType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Durée (Jours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 text-sm font-black outline-none text-indigo-700"
                      value={newAdminRequest.duration || (newAdminRequest.isHalfDay ? 0.5 : calculateBusinessDays(newAdminRequest.startDate, newAdminRequest.endDate))}
                      onChange={e => setNewAdminRequest({ ...newAdminRequest, duration: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Début (Inclus)</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500"
                      value={newAdminRequest.startDate}
                      onChange={e => setNewAdminRequest({ ...newAdminRequest, startDate: e.target.value })}
                    />
                  </div>
                  {!newAdminRequest.isHalfDay && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Fin (Inclus)</label>
                      <input
                        type="date"
                        required
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500"
                        value={newAdminRequest.endDate}
                        onChange={e => setNewAdminRequest({ ...newAdminRequest, endDate: e.target.value })}
                      />
                    </div>
                  )}
                  {newAdminRequest.isHalfDay && (
                    <div className="flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 opacity-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Demi-journée</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Commentaire</label>
                  <textarea rows={2} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-indigo-500 resize-none" placeholder="Motif ou note administrative..." value={newAdminRequest.comment} onChange={e => setNewAdminRequest({ ...newAdminRequest, comment: e.target.value })} />
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsCreatingRequest(false)} className="px-8 py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm">Annuler</button>
                  <button type="submit" className="px-10 py-4 bg-indigo-900 text-white font-black rounded-2xl hover:bg-black shadow-xl transition-all text-sm flex items-center gap-2">
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    Enregistrer ✨
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default AdminPanel;
