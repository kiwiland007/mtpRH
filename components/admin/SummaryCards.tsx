
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
    const cards = [
        {
            label: 'Validations',
            val: stats.pending,
            sub: 'En attente RH',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'rose',
            badge: stats.pending > 0 ? 'Urgent' : null
        },
        {
            label: 'Effectif Total',
            val: stats.totalEmployees,
            sub: 'Talents actifs',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'indigo'
        },
        {
            label: 'Traités',
            val: stats.approved,
            sub: 'Approbations globales',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'emerald'
        },
        {
            label: 'Indice Moyen',
            val: stats.avgDuration,
            unit: 'j',
            sub: 'Durée par demande',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            color: 'amber'
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                    <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 bg-${s.color}-600`}></div>

                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${s.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                                s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                    s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-amber-50 text-amber-600'
                            }`}>
                            {s.icon}
                        </div>
                        {s.badge && (
                            <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                {s.badge}
                            </span>
                        )}
                    </div>

                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{s.val}</p>
                            {s.unit && <span className="text-sm font-bold text-slate-400">{s.unit}</span>}
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">{s.sub}</p>
                    </div>

                    <div className={`absolute bottom-0 left-0 h-1 rounded-full transition-all duration-500 bg-${s.color}-500 w-0 group-hover:w-full`}></div>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;
