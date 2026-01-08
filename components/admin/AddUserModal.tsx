
import React from 'react';
import { UserRole } from '../../types';

interface AddUserModalProps {
    isAdding: boolean;
    setIsAdding: (val: boolean) => void;
    newUser: any;
    setNewUser: (val: any) => void;
    departments: string[];
    dbUsers: any[];
    onAddUser: (e: React.FormEvent) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
    isAdding,
    setIsAdding,
    newUser,
    setNewUser,
    departments,
    dbUsers,
    onAddUser
}) => {
    if (!isAdding) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[4rem] p-16 shadow-2xl animate-in">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Nouveau Talent</h3>
                <form onSubmit={onAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    );
};

export default AddUserModal;
