
import React from 'react';
import { LeaveStatus } from '../../types';

interface DecisionModalProps {
    decisionModal: { id: string, action: LeaveStatus } | null;
    setDecisionModal: (val: { id: string, action: LeaveStatus } | null) => void;
    managerComment: string;
    setManagerComment: (val: string) => void;
    onDecision: () => Promise<void>;
}

const DecisionModal: React.FC<DecisionModalProps> = ({
    decisionModal,
    setDecisionModal,
    managerComment,
    setManagerComment,
    onDecision
}) => {
    if (!decisionModal) return null;

    return (
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
                            onClick={onDecision}
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
    );
};

export default DecisionModal;
