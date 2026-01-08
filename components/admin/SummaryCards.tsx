
import React from 'react';

interface SummaryCardsProps {
    stats: {
        pending: number;
        totalEmployees: number;
        approved: number;
        avgDuration: string | number;
    };
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ stats }) => {
    return (
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
    );
};

export default SummaryCards;
