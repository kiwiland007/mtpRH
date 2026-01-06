
import React, { useState, useEffect } from 'react';
import { LeaveRequest, LeaveStatus } from '../types';
import { supabase } from '../lib/supabase';

interface TeamCalendarProps {
  requests: LeaveRequest[];
}

const TeamCalendar: React.FC<TeamCalendarProps> = ({ requests }) => {
  const [collabs, setCollabs] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthLabel = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchCollabs = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      setCollabs(data || []);
    };
    fetchCollabs();
  }, []);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  const getLeaveStatusOnDay = (userId: string, day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);

    return requests.find(r => {
      if (r.userId !== userId) return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Planning de l'Équipe</h2>
          <p className="text-slate-500 text-sm font-medium">Flux de présence MOUMEN RH</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="px-6 font-black text-slate-700 text-sm uppercase tracking-widest min-w-[160px] text-center">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className="grid grid-cols-[250px_repeat(auto-fit,minmax(35px,1fr))] bg-slate-50/50 border-b border-slate-100">
            <div className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 bg-white sticky left-0 z-20">Collaborateur</div>
            {days.map(d => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
              const isWeekend = date.getDay() === 0;
              return (
                <div key={d} className={`p-4 text-center text-[10px] font-black border-r border-slate-100 last:border-r-0 ${isWeekend ? 'bg-rose-50 text-rose-400' : 'text-slate-400'}`}>
                  {d}
                </div>
              );
            })}
          </div>

          {collabs.map(collab => (
            <div key={collab.id} className="grid grid-cols-[250px_repeat(auto-fit,minmax(35px,1fr))] border-b border-slate-50 last:border-b-0 hover:bg-indigo-50/10 transition-colors group">
              <div className="p-4 flex items-center space-x-3 border-r border-slate-200 bg-white sticky left-0 z-10">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white">{collab.full_name.charAt(0)}</div>
                <span className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{collab.full_name}</span>
              </div>
              {days.map(d => {
                const leave = getLeaveStatusOnDay(collab.id, d);
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                const isWeekend = date.getDay() === 0;
                
                return (
                  <div key={d} className={`h-14 border-r border-slate-100 last:border-r-0 relative flex items-center justify-center ${isWeekend ? 'bg-rose-50/30' : ''}`}>
                    {leave && (
                      <div 
                        className={`absolute inset-y-2 inset-x-0.5 rounded-md shadow-sm z-0 ${
                          leave.status === LeaveStatus.APPROVED ? 'bg-emerald-500 shadow-emerald-100' : 
                          leave.status === LeaveStatus.REJECTED ? 'bg-rose-400 shadow-rose-100' : 'bg-amber-400 shadow-amber-100'
                        }`}
                        title={`${leave.type} - ${leave.status}`}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-8">
        <div className="flex items-center space-x-3">
          <span className="w-4 h-4 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-100"></span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Validé</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="w-4 h-4 bg-amber-400 rounded-lg shadow-lg shadow-amber-100"></span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En attente</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="w-4 h-4 bg-rose-50 border border-rose-100 rounded-lg"></span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Repos / Weekend</span>
        </div>
      </div>
    </div>
  );
};

export default TeamCalendar;
