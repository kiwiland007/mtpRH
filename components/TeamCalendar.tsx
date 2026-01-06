
import React from 'react';
import { LeaveRequest } from '../types';

interface TeamCalendarProps {
  requests: LeaveRequest[];
}

const TeamCalendar: React.FC<TeamCalendarProps> = ({ requests }) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const currentMonth = "Juin 2024";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Planning de l'Équipe</h2>
          <p className="text-slate-500 text-sm">Visibilité globale des absences du département</p>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-4 py-2 font-bold text-slate-700">{currentMonth}</span>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[200px_repeat(30,1fr)] border-b border-slate-50 bg-slate-50/50">
            <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100">Collaborateur</div>
            {days.map(d => (
              <div key={d} className="p-4 text-center text-xs font-bold text-slate-400 border-r border-slate-100 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {[MOCK_COLLABS[0], MOCK_COLLABS[1]].map(collab => (
            <div key={collab.id} className="grid grid-cols-[200px_repeat(30,1fr)] border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
              <div className="p-4 flex items-center space-x-3 border-r border-slate-100">
                <img src={`https://ui-avatars.com/api/?name=${collab.name}&size=32&background=random`} className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium text-slate-700 truncate">{collab.name}</span>
              </div>
              {days.map(d => {
                const isLeave = (d >= 10 && d <= 14 && collab.id === '1');
                return (
                  <div key={d} className={`p-4 border-r border-slate-100 last:border-r-0 relative`}>
                    {isLeave && (
                      <div className="absolute inset-x-0 inset-y-2 bg-emerald-500/10 border-y border-emerald-500/20 z-0"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 bg-slate-50/50 flex space-x-6 text-xs font-medium text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
          <span>Validé</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
          <span>En attente</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-slate-200 rounded-full"></span>
          <span>Weekend / Férié</span>
        </div>
      </div>
    </div>
  );
};

const MOCK_COLLABS = [
  { id: '1', name: 'Ahmed Mansouri' },
  { id: '2', name: 'Siham Alaoui' },
  { id: '3', name: 'Karim Bennani' }
];

export default TeamCalendar;
