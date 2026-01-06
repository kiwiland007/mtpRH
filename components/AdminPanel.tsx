
import React, { useState, useEffect } from 'react';
import { UserRole, LeaveStatus, LeaveType } from '../types';
import { supabase } from '../lib/supabase';
import { calculateMoroccanAccruedDays } from '../utils/calculations';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminPanelProps {
  onUpdate?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdate }) => {
  const [view, setView] = useState<'overview' | 'requests' | 'users' | 'settings'>('overview');
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [decisionModal, setDecisionModal] = useState<{id: string, action: LeaveStatus} | null>(null);
  const [managerComment, setManagerComment] = useState('');
  
  const departments = ["Direction", "Sinistre", "Production", "Opérations", "Finance", "RH"];

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: UserRole.EMPLOYEE,
    department: 'Sinistre',
    hire_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: reqs } = await supabase.from('leave_requests').select('*, profiles(full_name, department)').order('created_at', { ascending: false });
      const { data: users } = await supabase.from('profiles').select('*').order('full_name');
      setAllRequests(reqs || []);
      setDbUsers(users || []);
    } catch (err) {
      console.error("Erreur de synchronisation:", err);
    } finally {
      setLoading(false);
    }
  };

  const getUserLeaveStats = (userId: string, hireDate: string) => {
    const totalAccrued = calculateMoroccanAccruedDays(hireDate);
    const consumed = allRequests
      .filter(r => r.user_id === userId && r.status === LeaveStatus.APPROVED)
      .reduce((sum, r) => sum + Number(r.duration), 0);
    return {
      totalAccrued,
      consumed,
      remaining: Math.max(0, totalAccrued - consumed),
      report: Math.max(0, totalAccrued - 18)
    };
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: editingUser.full_name,
        department: editingUser.department,
        role: editingUser.role,
        email: editingUser.email,
        hire_date: editingUser.hire_date
      }).eq('id', editingUser.id);
      if (error) throw error;
      setEditingUser(null);
      fetchData();
    } catch (err: any) { alert("Erreur: " + err.message); }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`ACTION IRREVOCABLE : Confirmez-vous la suppression de ${name} ?`)) return;
    setLoading(true);
    try {
      await supabase.from('leave_requests').delete().eq('user_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err: any) { 
      alert("Erreur lors de la suppression : " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('profiles').insert([newUser]);
      if (error) throw error;
      setIsAdding(false);
      setNewUser({ full_name: '', email: '', role: UserRole.EMPLOYEE, department: 'Sinistre', hire_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err: any) { alert("Erreur: " + err.message); }
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
    } catch (err: any) { alert("Erreur critique: " + err.message); }
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
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setView('overview')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'overview' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Analytique</button>
          <button onClick={() => setView('requests')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'requests' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Validations ({stats.pending})</button>
          <button onClick={() => setView('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'users' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Effectifs</button>
          <button onClick={() => setView('settings')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'settings' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500'}`}>Paramètres</button>
        </div>
        
        {view === 'users' && (
          <button onClick={() => setIsAdding(true)} className="bg-indigo-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl hover:scale-105 transition-all">+ Ajouter Talent</button>
        )}
      </div>

      {view === 'users' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in relative">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin"></div></div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-7">Talent</th>
                  <th className="px-10 py-7">Dpt</th>
                  <th className="px-10 py-7">Embauche</th>
                  <th className="px-10 py-7 text-center">Acquis</th>
                  <th className="px-10 py-7 text-center">Restant</th>
                  <th className="px-10 py-7 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dbUsers.map(u => {
                  const s = getUserLeaveStats(u.id, u.hire_date);
                  return (
                    <tr key={u.id} className="hover:bg-indigo-50/20 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{u.full_name.charAt(0)}</div>
                          <div><p className="font-bold text-slate-900 tracking-tight">{u.full_name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-10 py-6 font-bold text-indigo-600">{u.department}</td>
                      <td className="px-10 py-6 font-medium text-slate-500">{new Date(u.hire_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-10 py-6 text-center font-bold text-slate-600">{s.totalAccrued.toFixed(1)} j</td>
                      <td className="px-10 py-6 text-center"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black">{s.remaining.toFixed(1)} j</span></td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      )}

      {/* Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-6"><div className="w-20 h-20 bg-indigo-900 text-white rounded-[2rem] flex items-center justify-center text-2xl font-black">{editingUser.full_name.charAt(0)}</div><div><h3 className="text-3xl font-black text-slate-900 tracking-tighter">{editingUser.full_name}</h3><p className="text-slate-400 font-medium italic">Audit de solde & Paramètres</p></div></div>
                <button onClick={() => setEditingUser(null)} className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Données Identité</h4>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nom Complet</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" value={editingUser.full_name} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Département</label>
                        <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.department} onChange={e => setEditingUser({...editingUser, department: e.target.value})}>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                      </div>
                   </div>
                </div>
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Contrat & Solde</h4>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Date d'embauche</label>
                        <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={editingUser.hire_date} onChange={e => setEditingUser({...editingUser, hire_date: e.target.value})} />
                      </div>
                      <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mt-4">
                        <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-indigo-900">Congés Acquis</span><span className="text-lg font-black text-indigo-600">{calculateMoroccanAccruedDays(editingUser.hire_date).toFixed(1)} j</span></div>
                        <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-rose-900">Consommé</span><span className="text-lg font-black text-rose-600">-{allRequests.filter(r => r.user_id === editingUser.id && r.status === LeaveStatus.APPROVED).reduce((sum, r) => sum + Number(r.duration), 0)} j</span></div>
                      </div>
                   </div>
                </div>
                <button type="submit" className="col-span-full bg-indigo-900 text-white py-6 rounded-[2rem] font-black text-sm shadow-xl hover:bg-black transition-all">Enregistrer les modifications</button>
             </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-16 shadow-2xl animate-in">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Nouveau Talent</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input required className="col-span-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Nom Complet" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
              <input type="email" required className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <select className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})}>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="col-span-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Date d'embauche</label>
                <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none" value={newUser.hire_date} onChange={e => setNewUser({...newUser, hire_date: e.target.value})} />
              </div>
              <button type="submit" className="col-span-full bg-indigo-900 text-white py-6 rounded-[2rem] font-black text-sm hover:bg-black transition-all">Intégrer dans MOUMEN RH</button>
              <button type="button" onClick={() => setIsAdding(false)} className="col-span-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Fermer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
