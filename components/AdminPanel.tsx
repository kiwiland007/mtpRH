
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

const AdminPanel: React.FC = () => {
  const [view, setView] = useState<'stats' | 'users' | 'settings'>('stats');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: UserRole.EMPLOYEE,
    department: '',
    hire_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchUsers();
  }, [view]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDbUsers(data || []);
    } catch (err: any) {
      console.error("Erreur fetch users:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([newUser]);

      if (error) throw error;
      
      setIsAdding(false);
      setNewUser({
        full_name: '',
        email: '',
        role: UserRole.EMPLOYEE,
        department: '',
        hire_date: new Date().toISOString().split('T')[0]
      });
      fetchUsers();
    } catch (error: any) {
      alert("Erreur: " + error.message + ". Assurez-vous d'avoir créé la table 'profiles'.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Administration</h1>
          <p className="text-slate-500">Gérez vos collaborateurs et les paramètres RH</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
          <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Stats</button>
          <button onClick={() => setView('users')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'users' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Utilisateurs</button>
        </div>
      </div>

      {view === 'users' && (
        <div className="space-y-6">
          {isAdding && (
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-500 shadow-2xl animate-in">
              <h3 className="text-lg font-bold mb-4">Nouveau Collaborateur</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder="Nom complet" 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  required
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  required
                />
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.EMPLOYEE}>Collaborateur</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.HR}>RH</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
                <input 
                  placeholder="Département" 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                  value={newUser.department}
                  onChange={e => setNewUser({...newUser, department: e.target.value})}
                />
                <div className="flex gap-2 col-span-full">
                  <button type="submit" disabled={loading} className="bg-emerald-600 text-white flex-1 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50">
                    {loading ? 'Enregistrement...' : 'Enregistrer le profil'}
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="bg-slate-100 px-6 rounded-xl font-bold">Annuler</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Collaborateurs enregistrés</h2>
              <button onClick={() => setIsAdding(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                + Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                    <th className="px-8 py-4">Utilisateur</th>
                    <th className="px-8 py-4">Département</th>
                    <th className="px-8 py-4">Rôle</th>
                    <th className="px-8 py-4">Date d'embauche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">{u.full_name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-700">{u.full_name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-600">{u.department || 'Non défini'}</td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${u.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500">{new Date(u.hire_date).toLocaleDateString('fr-MA')}</td>
                    </tr>
                  ))}
                  {dbUsers.length === 0 && !loading && (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-400">Aucun collaborateur trouvé. Utilisez le bouton Ajouter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Effectif Global</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{dbUsers.length}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Congés ce mois</p>
            <p className="text-4xl font-black text-emerald-600 mt-2">--</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">En attente RH</p>
            <p className="text-4xl font-black text-amber-500 mt-2">0</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
