
import React from 'react';
import { User, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateMoroccanAccruedDays } from '../utils/calculations';

interface DashboardProps {
  user: User;
  requests: LeaveRequest[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, requests }) => {
  const totalAccrued = Math.floor(calculateMoroccanAccruedDays(user.hireDate));
  const used = requests
    .filter(r => r.status === LeaveStatus.APPROVED)
    .reduce((sum, r) => sum + r.duration, 0);
  const pending = requests
    .filter(r => r.status === LeaveStatus.PENDING)
    .reduce((sum, r) => sum + r.duration, 0);
  const currentRemaining = totalAccrued - used;

  const chartData = [
    { name: 'Pris', value: used, color: '#10b981' },
    { name: 'En attente', value: pending, color: '#f59e0b' },
    { name: 'Restant', value: currentRemaining, color: '#3b82f6' },
  ];

  // Trier les requêtes par date de création pour calculer le solde historique si besoin
  const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord de {user.fullName}</h1>
          <p className="text-slate-500">Département : {user.department}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-800 font-medium">Ancienneté : {Math.floor((new Date().getTime() - new Date(user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} ans</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Acquis</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalAccrued}</p>
          <p className="text-xs text-slate-400 mt-1">Légal + Ancienneté</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Congés Consommés</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{used}</p>
          <p className="text-xs text-slate-400 mt-1">Jours validés</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">En cours</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{pending}</p>
          <p className="text-xs text-slate-400 mt-1">À approuver</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Solde Restant</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{currentRemaining}</p>
          <p className="text-xs text-blue-400 mt-1">Disponible</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold">Mes demandes</h2>
            <div className="flex items-center gap-2">
               <span className="text-xs font-medium text-slate-400">Solde actuel:</span>
               <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{currentRemaining} j</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Période</th>
                  <th className="px-6 py-4 font-semibold text-center">Jours</th>
                  <th className="px-6 py-4 font-semibold text-center">Solde Final*</th>
                  <th className="px-6 py-4 font-semibold text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRequests.map((req, index) => {
                  // Calcul du solde restant après cette demande (si approuvée)
                  // On simule ici la déduction du solde
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{req.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(req.startDate).toLocaleDateString('fr-FR')} - {new Date(req.endDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">-{req.duration}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {req.status === LeaveStatus.APPROVED ? currentRemaining : currentRemaining - req.duration} j
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                          req.status === LeaveStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {req.status === LeaveStatus.APPROVED ? 'Approuvé' : req.status === LeaveStatus.PENDING ? 'Attente' : 'Refusé'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 italic">
            * Le solde final indique ce qu'il vous resterait si la demande en attente est approuvée.
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Répartition</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
            Note: Les congés annuels sont cumulés à raison de 1.5j par mois conformément à l'Art. 231 du Code du Travail.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
