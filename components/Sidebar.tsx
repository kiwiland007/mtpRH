
import React from 'react';
import { UserRole } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  userRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: ICONS.Dashboard },
    { id: 'request', label: 'Nouvelle Demande', icon: ICONS.Calendar },
    { id: 'calendar', label: 'Planning Équipe', icon: ICONS.Calendar },
  ];

  if (userRole === UserRole.ADMIN || userRole === UserRole.HR) {
    menuItems.push({ id: 'admin', label: 'Administration', icon: ICONS.Settings });
  }

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xl">M</div>
        <span className="text-xl font-bold tracking-tight">MarocCongés</span>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 bg-slate-800/50 m-4 rounded-2xl border border-slate-700/50">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Support</p>
        <p className="text-sm text-slate-300">Besoin d'aide ?</p>
        <button className="text-xs text-emerald-400 font-semibold mt-1 hover:underline">Contactez les RH</button>
      </div>
    </div>
  );
};

export default Sidebar;
