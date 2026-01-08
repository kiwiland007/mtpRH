
import React from 'react';
import { User, UserRole, LeaveStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { calculateMoroccanAccruedDays } from '../../utils/calculations';

interface EditingUserModalProps {
    editingUser: any;
    setEditingUser: (user: any | null) => void;
    departments: string[];
    dbUsers: any[];
    allRequests: any[];
    onUpdateUser: (e: React.FormEvent) => Promise<void>;
    generatePassword: () => void;
    generatedPassword: string;
    onNotification?: (message: string) => void;
    auditLog: (action: string, details: any) => Promise<void>;
}

const EditingUserModal: React.FC<EditingUserModalProps> = ({
    editingUser,
    setEditingUser,
    departments,
    dbUsers,
    allRequests,
    onUpdateUser,
    generatePassword,
    generatedPassword,
    onNotification,
    auditLog
}) => {
    if (!editingUser) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 shadow-2xl animate-in max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-indigo-900 text-white rounded-[2rem] flex items-center justify-center text-2xl font-black">
                            {editingUser.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{editingUser.full_name}</h3>
                            <p className="text-slate-400 font-medium italic">Audit de solde & Paramètres</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingUser(null)} className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={onUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
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
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
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
    );
};

export default EditingUserModal;
