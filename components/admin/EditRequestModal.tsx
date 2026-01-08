
import React from 'react';
import { LeaveType } from '../../types';

interface EditRequestModalProps {
    editRequestModal: any;
    setEditRequestModal: (req: any | null) => void;
    onEditRequest: (e: React.FormEvent) => Promise<void>;
}

const EditRequestModal: React.FC<EditRequestModalProps> = ({
    editRequestModal,
    setEditRequestModal,
    onEditRequest
}) => {
    if (!editRequestModal) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[90] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Modifier la demande</h3>
                <form onSubmit={onEditRequest} className="space-y-6">
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
    );
};

export default EditRequestModal;
