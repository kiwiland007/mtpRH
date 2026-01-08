
import React from 'react';
import { LeaveType } from '../../types';
import { calculateBusinessDays } from '../../utils/calculations';

interface AdminCreateRequestModalProps {
    isCreatingRequest: boolean;
    setIsCreatingRequest: (val: boolean) => void;
    newAdminRequest: any;
    setNewAdminRequest: (val: any) => void;
    dbUsers: any[];
    onAdminCreateRequest: (e: React.FormEvent) => Promise<void>;
    loading: boolean;
}

const AdminCreateRequestModal: React.FC<AdminCreateRequestModalProps> = ({
    isCreatingRequest,
    setIsCreatingRequest,
    newAdminRequest,
    setNewAdminRequest,
    dbUsers,
    onAdminCreateRequest,
    loading
}) => {
    if (!isCreatingRequest) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[90] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 px-2">Créer une demande (Admin)</h3>
                <form onSubmit={onAdminCreateRequest} className="space-y-6">
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
    );
};

export default AdminCreateRequestModal;
