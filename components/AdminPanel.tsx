
import React, { useState, useEffect } from 'react';
import { UserRole, LeaveStatus, LeaveType, User } from '../types';
import { supabase } from '../lib/supabase';
import { calculateBalanceAnalysis, calculateBusinessDays } from '../utils/calculations';
import { adminService } from '../services/adminService';
import { notificationService } from '../services/notificationService';
import {
  EditingUserModal,
  EditRequestModal,
  DecisionModal,
  AddUserModal,
  AdminCreateRequestModal,
  SummaryCards,
  AnalyticsCharts
} from './admin';

interface AdminPanelProps {
  user?: User | null;
  onUpdate?: () => void;
  onNotification?: (message: string) => void;
  onNavigate?: (tab: 'dashboard' | 'request' | 'calendar' | 'admin' | 'carryovers' | 'history') => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onUpdate, onNotification, onNavigate }) => {
  const [view, setView] = useState<'overview' | 'requests' | 'users' | 'settings' | 'history' | 'reports' | 'logs' | 'integrity'>('overview');
  const [localNotification, setLocalNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const showAdminNotification = (type: 'success' | 'error', message: string) => {
    setLocalNotification({ type, message });
    if (onNotification) onNotification(message);
    setTimeout(() => setLocalNotification(null), 5000);
  };

  const auditLog = async (action: string, details: any) => {
    try {
      await adminService.logAudit(action, details, user?.id);
    } catch (e) {
      console.warn("Audit logging failed:", e);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, users, logData] = await Promise.all([
        adminService.fetchAllRequests(),
        adminService.fetchUsers(),
        adminService.fetchLogs()
      ]);

      setAllRequests(reqs);
      setDbUsers(users);
      setLogs(logData);
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

    if (!editingUser.full_name.trim()) {
      if (onNotification) onNotification("Le nom complet est requis");
      return;
    }

    if (!editingUser.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
      if (onNotification) onNotification("Email invalide");
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
        is_active: editingUser.is_active,
        balance_adjustment: Number(editingUser.balance_adjustment),
        manager_id: editingUser.manager_id || null
      };

      const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
      if (error) throw error;

      await auditLog('UPDATE_USER', { target: editingUser.full_name, id: editingUser.id });
      setEditingUser(null);
      fetchData();
      if (onNotification) onNotification("Talent mis à jour avec succès ✨");
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur: ${err.message}`);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').insert([newUser]);
      if (error) throw error;
      await auditLog('CREATE_USER', { name: newUser.full_name });
      setIsAdding(false);
      setNewUser({
        full_name: '', email: '', role: UserRole.EMPLOYEE, department: 'Sinistre',
        hire_date: new Date().toISOString().split('T')[0], is_active: true, manager_id: ''
      });
      fetchData();
      if (onNotification) onNotification("Nouvel utilisateur ajouté avec succès ✨");
    } catch (err: any) {
      if (onNotification) onNotification(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!decisionModal || !decisionModal.id) return;

    const targetId = decisionModal.id;
    const targetAction = decisionModal.action;
    const comment = managerComment;

    try {
      setLoading(true);

      const { data: updatedReq, error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: targetAction,
          manager_comment: comment
        })
        .eq('id', targetId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (targetAction === LeaveStatus.APPROVED && updatedReq) {
        try {
          const fiscalYear = new Date(updatedReq.start_date).getFullYear();

          // 1. Vérifier si l'entrée existe déjà
          const { data: existing } = await supabase
            .from('leave_history')
            .select('id')
            .eq('leave_request_id', updatedReq.id)
            .maybeSingle();

          const historyData = {
            user_id: updatedReq.user_id,
            leave_request_id: updatedReq.id,
            leave_type: updatedReq.type,
            start_date: updatedReq.start_date,
            end_date: updatedReq.end_date,
            duration: updatedReq.duration,
            status: LeaveStatus.APPROVED,
            fiscal_year: fiscalYear,
            manager_comment: comment,
            approved_by: user?.id,
            approved_at: new Date().toISOString()
          };

          if (existing) {
            // Mise à jour
            await supabase.from('leave_history').update(historyData).eq('id', existing.id);
          } else {
            // Insertion
            await supabase.from('leave_history').insert([historyData]);
          }
        } catch (historyErr) {
          console.warn("Erreur synchronisation historique (non-bloquante):", historyErr);
        }
      }

      await auditLog('DECISION_REQUEST', { id: targetId, action: targetAction });

      if (updatedReq) {
        notificationService.createNotification(
          updatedReq.user_id,
          `Demande ${targetAction === LeaveStatus.APPROVED ? 'approuvée' : 'refusée'}`,
          `Votre demande (${updatedReq.type}) du ${new Date(updatedReq.start_date).toLocaleDateString()} a été traitée.`,
          targetAction === LeaveStatus.APPROVED ? 'success' : 'error'
        ).catch(() => { });
      }

      setDecisionModal(null);
      setManagerComment('');
      await fetchData();
      showAdminNotification('success', `Demande ${targetAction === LeaveStatus.APPROVED ? 'approuvée' : 'refusée'} avec succès`);
    } catch (err: any) {
      console.error("Erreur validation:", err);
      showAdminNotification('error', `Erreur critique: ${err.message}`);
    } finally {
      setLoading(false);
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
      await auditLog('EDIT_REQUEST', { id: editRequestModal.id });
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
      showAdminNotification('error', "Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      setLoading(true);
      const finalDuration = Number(newAdminRequest.duration) || calculateBusinessDays(newAdminRequest.startDate, newAdminRequest.isHalfDay ? newAdminRequest.startDate : newAdminRequest.endDate);

      if (finalDuration <= 0) {
        showAdminNotification('error', "La durée doit être supérieure à 0 (vérifiez les dates)");
        return;
      }

      const { data: newReq, error } = await supabase.from('leave_requests').insert([{
        user_id: newAdminRequest.userId,
        type: newAdminRequest.type,
        start_date: newAdminRequest.startDate,
        end_date: newAdminRequest.isHalfDay ? newAdminRequest.startDate : newAdminRequest.endDate,
        status: LeaveStatus.PENDING, // Passer en PENDING pour visibilité dans le Flux
        duration: finalDuration,
        comment: newAdminRequest.comment || 'Créé par l\'administrateur'
      }]).select().single();

      if (error) throw error;

      await auditLog('CREATE_REQUEST_ADMIN', { user_id: newAdminRequest.userId, duration: finalDuration });
      setIsCreatingRequest(false);
      setNewAdminRequest({ userId: '', type: LeaveType.ANNUAL, startDate: '', endDate: '', comment: '', duration: 0, isHalfDay: false });

      await fetchData();
      showAdminNotification('success', "Flux de congé initié avec succès");
    } catch (e: any) {
      console.error("Erreur création admin:", e);
      showAdminNotification('error', `Erreur fatale: ${e.message}`);
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
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* Top Premium Header */}
        <div className="bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/5">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Gouvernance RH</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none break-words">Console d'Administration</h1>
              <p className="text-slate-400 font-medium max-w-lg text-sm md:text-base">
                Supervision stratégique des effectifs, validation des flux de congés et conformité aux protocoles organisationnels.
              </p>
            </div>

            <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-2xl md:self-center shadow-2xl overflow-x-auto max-w-full custom-scrollbar">
              {[
                { id: 'overview', label: 'Cockpit', icon: '📊' },
                { id: 'requests', label: 'Flux', icon: '⚡', count: stats.pending },
                { id: 'users', label: 'Talents', icon: '👥' },
                { id: 'logs', label: 'Audit', icon: '📜' },
                { id: 'settings', label: 'Console', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as any)}
                  className={`relative flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${view === tab.id
                    ? 'bg-white text-slate-950 shadow-[0_10px_20px_rgba(0,0,0,0.2)] scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black bg-rose-500 text-white ${view === tab.id ? '' : 'animate-pulse'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SummaryCards stats={stats} />

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
              {view === 'overview' ? 'Vision Analytique' :
                view === 'requests' ? 'Validation des Flux' :
                  view === 'users' ? 'Répertoire des Talents' :
                    view === 'logs' ? 'Traçabilité Système' : 'Configuration Système'}
            </h2>
            <p className="text-sm text-slate-500 font-medium">Gestion temps réel de la plateforme mtpRH</p>
          </div>

          <div className="flex gap-3">
            {view === 'users' && (
              <button
                onClick={() => setIsAdding(true)}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:scale-105 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Recruter un Talent
              </button>
            )}
            <button
              onClick={fetchData}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all group"
            >
              <svg className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-700 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {view === 'overview' && <AnalyticsCharts deptData={deptData} />}

        {/* Requests View */}
        {view === 'requests' && (
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Flux de Validation</h3>
                <p className="text-slate-500 text-xs font-medium mt-1">{stats.pending} dossier(s) en attente d'arbitrage</p>
              </div>
              <button
                onClick={() => setIsCreatingRequest(true)}
                className="h-10 px-5 bg-indigo-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Saisie Manuelle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <th className="px-8 py-5">Collaborateur</th>
                    <th className="px-8 py-5">Catégorie</th>
                    <th className="px-8 py-5">Calendrier</th>
                    <th className="px-8 py-5 text-center">Durée</th>
                    <th className="px-8 py-5 text-right uppercase">Arbitrage RH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {allRequests.filter(r => r.status === LeaveStatus.PENDING).map(req => (
                    <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                            {(req.profiles?.full_name || 'A').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{req.profiles?.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.profiles?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {req.type === LeaveType.ANNUAL ? '🏝️' : req.type === LeaveType.SICK ? '🤒' : '🌟'}
                          </span>
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{req.type}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">
                        {new Date(req.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} — {new Date(req.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex h-8 w-12 items-center justify-center bg-indigo-950 text-white rounded-lg text-xs font-black">
                          {req.duration}j
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest">
                          <button onClick={() => setDecisionModal({ id: req.id, action: LeaveStatus.APPROVED })} className="h-9 px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all">Approuver</button>
                          <button onClick={() => setDecisionModal({ id: req.id, action: LeaveStatus.REJECTED })} className="h-9 px-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all">Rejeter</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allRequests.filter(r => r.status === LeaveStatus.PENDING).length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">Aucune demande en attente</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users View */}
        {view === 'users' && (
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Répertoire des Talents</h3>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Filtrer un talent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20 w-64 transition-all"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <th className="px-10 py-7">Talent</th>
                    <th className="px-10 py-7">Département</th>
                    <th className="px-10 py-7">Statut</th>
                    <th className="px-10 py-7">Acquis</th>
                    <th className="px-10 py-7 text-center">Restant</th>
                    <th className="px-10 py-7 text-right uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {(() => {
                    const filtered = dbUsers.filter(u =>
                      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.department?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    if (filtered.length === 0) return (
                      <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold italic">Aucun talent trouvé pour "{searchTerm}"</td></tr>
                    );
                    return filtered.map(u => {
                      const s = getUserLeaveStats(u.id, u.hire_date, u.balance_adjustment);
                      return (
                        <tr key={u.id} className={`group hover:bg-slate-50/50 transition-all ${!u.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100">
                                {u.full_name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 leading-none mb-1">{u.full_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-[10px] font-black uppercase text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-lg">{u.department}</span>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              <span className="text-[10px] font-black uppercase tracking-widest">{u.is_active ? 'Actif' : 'Archive'}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-xs font-bold text-slate-600">{s.totalAccrued.toFixed(1)}j</td>
                          <td className="px-10 py-6 text-center">
                            <span className="inline-flex h-8 px-3 items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black">{s.remaining.toFixed(1)}j</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingUser(u)} className="h-9 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Gérer</button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs View */}
        {view === 'logs' && (
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Journaux d'Audit</h3>
              <button
                onClick={() => {
                  const csv = "\uFEFF" + ['Date', 'Action', 'Auteur'].join(',') + "\n" + logs.map(l => [new Date(l.created_at).toLocaleString(), l.action, l.profiles?.full_name].join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "audit.csv";
                  link.click();
                }}
                className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Exporter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Horodatage</th>
                    <th className="px-8 py-5">Événement</th>
                    <th className="px-8 py-5">Opérateur</th>
                    <th className="px-8 py-5">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-[10px] font-bold text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">{log.action}</span>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-700">{log.profiles?.full_name || 'Système'}</td>
                      <td className="px-8 py-5">
                        <div className="group relative">
                          <code className="text-[10px] text-slate-400 truncate max-w-[200px] block">{JSON.stringify(log.details)}</code>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings/Console View */}
        {view === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Configuration Console</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Export de Données</div>
                    <p className="text-xs text-slate-600 mb-6 font-medium">Générez un rapport exhaustif des soldes et des effectifs au format universel CSV.</p>
                    <button
                      onClick={() => {
                        try {
                          const headers = ['Nom', 'Email', 'Departement', 'Date Embauche', 'Acquis Total', 'Consomme', 'Restant', 'Droit Annuel', 'Dont Report', 'Ajustement Manuel', 'Statut'];
                          const rows = dbUsers.map(u => {
                            const consumed = allRequests.filter(r => r.user_id === u.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0);
                            const analysis = calculateBalanceAnalysis(u.hire_date, consumed, u.balance_adjustment);
                            return [
                              `"${u.full_name}"`,
                              u.email,
                              u.department,
                              u.hire_date,
                              analysis.totalAccrued.toFixed(2),
                              analysis.consumed.toFixed(2),
                              analysis.remaining.toFixed(2),
                              analysis.currentAnnualRate,
                              analysis.carryOver.toFixed(2),
                              u.balance_adjustment || 0,
                              u.is_active === false ? 'Archive' : 'Actif'
                            ].join(',');
                          });
                          const csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement("a");
                          const url = URL.createObjectURL(blob);
                          link.setAttribute("href", url);
                          link.setAttribute("download", `mtp_rh_export_${new Date().toISOString().split('T')[0]}.csv`);
                          link.click();
                          if (onNotification) onNotification('Synthèse CSV exportée');
                        } catch (e: any) {
                          if (onNotification) onNotification(`Erreur d'export: ${e.message}`);
                        }
                      }}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Télécharger le Répertoire
                    </button>
                  </div>

                  <div className="p-6 bg-rose-50/30 rounded-[2rem] border border-rose-100 group hover:border-rose-300 transition-colors">
                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Maintenance Critique</div>
                    <p className="text-xs text-rose-900/60 mb-6 font-medium">Réinitialisation complète de l'instance. Supprime tous les talents et demandes de démonstration.</p>
                    <button
                      onClick={async () => {
                        if (window.confirm('Voulez-vous vraiment supprimer toutes les données de démonstration ? Seul votre compte administrateur sera conservé.')) {
                          setLoading(true);
                          try {
                            const { error } = await supabase.from('profiles').delete().neq('role', 'ADMIN');
                            if (error) throw error;
                            await auditLog('CLEAN_DEMO', { status: 'success' });
                            fetchData();
                            if (onNotification) onNotification('Instance nettoyée avec succès');
                          } catch (e: any) {
                            if (onNotification) onNotification(`Erreur: ${e.message}`);
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Wipe Démonstration
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
                <h3 className="text-xl font-black mb-6 tracking-tight">Infrastructure & Légalité</h3>
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Version</p>
                    <p className="font-bold">v5.2.0</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Calculateur</p>
                    <p className="font-bold text-emerald-400">Moroccan Labor Logic 🇲🇦</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Diagnostic Express</h4>
                <button onClick={() => setView('integrity')} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Lancer Analyse</button>
              </div>
            </div>
          </div>
        )}

        {/* Integrity View */}
        {view === 'integrity' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shadow-inner">🩺</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Analyseur d'Intégrité</h3>
                  <p className="text-slate-500 text-xs font-medium mt-1">Détection proactive des incohérences de base de données</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Overlapping Requests */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                      Conflits Temporels
                    </h4>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                      if (overlaps.length === 0) return (
                        <div className="p-8 text-center bg-emerald-50/30 rounded-[2rem] border border-emerald-100 border-dashed">
                          <span className="text-2xl mb-2 block">✅</span>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Optimal</p>
                        </div>
                      );
                      return overlaps.map((o, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold">{o.name}</p>
                            <p className="text-[10px] text-rose-500">{o.date1} ↔ {o.date2}</p>
                          </div>
                          <button onClick={() => setView('requests')} className="text-[10px] font-black text-indigo-600">Voir</button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Inconsistent Durations */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                      Moteur de Calcul
                    </h4>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const errors = allRequests.filter(r => {
                        const expected = calculateBusinessDays(r.start_date, r.end_date);
                        return Math.abs(Number(r.duration) - expected) > 0.01;
                      });
                      if (errors.length === 0) return (
                        <div className="p-8 text-center bg-indigo-50/30 rounded-[2rem] border border-indigo-100 border-dashed">
                          <span className="text-2xl mb-2 block">🦾</span>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Cohérent</p>
                        </div>
                      );
                      return errors.map((r, i) => {
                        const expected = calculateBusinessDays(r.start_date, r.end_date);
                        return (
                          <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold">{r.profiles?.full_name}</p>
                              <p className="text-[10px] text-amber-600">{r.duration}j → {expected}j</p>
                            </div>
                            <button
                              onClick={async () => {
                                const { error } = await supabase.from('leave_requests').update({ duration: expected }).eq('id', r.id);
                                if (!error) { fetchData(); if (onNotification) onNotification("Corrigé"); }
                              }}
                              className="text-[10px] font-black text-indigo-600"
                            >
                              Corriger
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4">
                <button
                  onClick={async () => {
                    if (window.confirm("Purifier les doublons ?")) {
                      const overlaps: string[] = [];
                      allRequests.forEach(r1 => {
                        allRequests.forEach(r2 => {
                          if (r1.id !== r2.id && r1.user_id === r2.user_id && r1.status !== 'REJECTED' && r2.status !== 'REJECTED') {
                            if (new Date(r1.start_date) <= new Date(r2.end_date) && new Date(r2.start_date) <= new Date(r1.end_date)) {
                              if (!overlaps.includes(r1.id) && !overlaps.includes(r2.id)) overlaps.push(r2.id);
                            }
                          }
                        });
                      });
                      if (overlaps.length > 0) {
                        const { error } = await supabase.from('leave_requests').delete().in('id', overlaps);
                        if (!error) fetchData();
                      }
                    }
                  }}
                  className="h-12 px-6 bg-rose-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Purifier Doublons
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <EditingUserModal editingUser={editingUser} setEditingUser={setEditingUser} departments={departments} dbUsers={dbUsers} allRequests={allRequests} onUpdateUser={handleUpdateUser} generatePassword={generatePassword} generatedPassword={generatedPassword} onNotification={onNotification} auditLog={auditLog} />
        <EditRequestModal editRequestModal={editRequestModal} setEditRequestModal={setEditRequestModal} onEditRequest={handleEditRequest} />
        <DecisionModal decisionModal={decisionModal} setDecisionModal={setDecisionModal} managerComment={managerComment} setManagerComment={setManagerComment} onDecision={handleDecision} />
        <AddUserModal isAdding={isAdding} setIsAdding={setIsAdding} newUser={newUser} setNewUser={setNewUser} departments={departments} dbUsers={dbUsers} onAddUser={handleAddUser} />
        <AdminCreateRequestModal isCreatingRequest={isCreatingRequest} setIsCreatingRequest={setIsCreatingRequest} newAdminRequest={newAdminRequest} setNewAdminRequest={setNewAdminRequest} dbUsers={dbUsers} onAdminCreateRequest={handleAdminCreateRequest} loading={loading} />

        {/* Système de Notification Interne */}
        {localNotification && (
          <div className={`fixed bottom-8 right-8 z-[100] p-5 rounded-[2rem] shadow-2xl border-2 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500 min-w-[320px] backdrop-blur-xl ${localNotification.type === 'success'
            ? 'bg-emerald-500/95 text-white border-emerald-400'
            : 'bg-rose-500/95 text-white border-rose-400'
            }`}>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              {localNotification.type === 'success' ? '✨' : '⚠️'}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{localNotification.type === 'success' ? 'Succès Admin' : 'Alerte Système'}</p>
              <p className="text-sm font-bold tracking-tight">{localNotification.message}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
