
import React from 'react';
import { UserRole } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  userRole: UserRole;
  onOpenSupport?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, userRole, onOpenSupport }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: ICONS.Dashboard },
    { id: 'request', label: 'Ma demande', icon: ICONS.Calendar },
    { id: 'calendar', label: 'Planning Équipe', icon: ICONS.Calendar },
    { id: 'history', label: 'Historique', icon: ICONS.History },
  ];

  if (userRole === UserRole.ADMIN || userRole === UserRole.HR || userRole === UserRole.MANAGER) {
    menuItems.push({ id: 'admin', label: 'Administration RH', icon: ICONS.Settings });
  }

  // Onglet Reports de Solde (uniquement pour les admins)
  if (userRole === UserRole.ADMIN) {
    menuItems.push({
      id: 'carryovers',
      label: 'Reports de Solde',
      icon: ICONS.Calendar
    });
  }

  return (
    <div className="w-72 bg-slate-950 text-white flex flex-col hidden md:flex border-r border-slate-800">
      <div className="p-8 flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-xl shadow-indigo-500/20">
              {/* Logo stylisé inspiré par l'image fournie */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M10 50 L50 15 L90 50" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                <path d="M25 45 L25 85 L75 85 L75 45" fill="none" stroke="#1e3a8a" strokeWidth="8" />
                <path d="M40 85 L50 60 L60 85" fill="#1e3a8a" />
                <circle cx="50" cy="52" r="4" fill="#1e3a8a" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter block leading-none">MOUMEN</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">RH & Prevoyance</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-1.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-300 ${activeTab === item.id
              ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40 translate-x-1'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 bg-slate-900/50 m-6 rounded-3xl border border-slate-800/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Support Agent General</p>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed mb-3">AXA Assurance - Assistance Technique</p>
        <button
          onClick={() => {
            if (onOpenSupport) {
              onOpenSupport();
            } else {
              alert('Fonctionnalité de support en cours de déploiement');
            }
          }}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black transition-all border border-slate-700 uppercase tracking-widest"
        >
          Ouvrir un ticket
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
