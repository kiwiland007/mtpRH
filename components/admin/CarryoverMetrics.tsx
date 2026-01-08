
import React from 'react';
import { EmployeeBalanceView } from '../../types';

interface CarryoverMetricsProps {
    data: EmployeeBalanceView[];
}

const CarryoverMetrics: React.FC<CarryoverMetricsProps> = ({ data }) => {
    const totalEmployees = data.length;
    const validatedCount = data.filter(c => c.status === 'VALIDATED').length;
    const pendingCount = data.filter(c => c.status === 'PENDING').length;
    const totalForfeited = data.reduce((sum, c) => sum + (c.forfeitedDays || 0), 0);
    const avgRemaining = totalEmployees ? (data.reduce((sum, c) => sum + c.remainingDays, 0) / totalEmployees).toFixed(1) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Effectif</div>
                    <div className="text-3xl font-black text-slate-900">{totalEmployees}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                    Collaborateurs actifs
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Validés (N+1)</div>
                    <div className="text-3xl font-black text-emerald-600">{validatedCount}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full transition-all duration-1000"
                            style={{ width: `${totalEmployees ? (validatedCount / totalEmployees) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">En Attente</div>
                    <div className="text-3xl font-black text-amber-600">{pendingCount}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                            className="bg-amber-500 h-full transition-all duration-1000"
                            style={{ width: `${totalEmployees ? (pendingCount / totalEmployees) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="bg-rose-50 rounded-3xl p-6 shadow-xl border border-rose-100 flex flex-col justify-between">
                <div>
                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Jours Perdus</div>
                    <div className="text-3xl font-black text-rose-600">{totalForfeited.toFixed(1)}j</div>
                </div>
                <div className="mt-4 pt-4 border-t border-rose-100 text-[10px] font-bold text-rose-400 italic">
                    Plafond légal (1/3) atteint
                </div>
            </div>

            <div className="bg-indigo-50 rounded-3xl p-6 shadow-xl border border-indigo-100 flex flex-col justify-between">
                <div>
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Moy. Restant</div>
                    <div className="text-3xl font-black text-indigo-600">{avgRemaining}j</div>
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-100 text-[10px] font-bold text-indigo-400">
                    Par collaborateur
                </div>
            </div>
        </div>
    );
};

export default CarryoverMetrics;
