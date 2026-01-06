
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center md:hidden">
         <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-white mr-2">M</div>
         <span className="text-lg font-bold">MarocCongés</span>
      </div>
      
      <div className="hidden md:block">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Rechercher une demande..." 
            className="bg-slate-50 border-none rounded-full py-2 px-10 text-sm focus:ring-2 focus:ring-emerald-500 w-64 transition-all"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-4 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button className="relative p-2 text-slate-400 hover:text-emerald-600 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center space-x-3 group cursor-pointer" onClick={onLogout}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{user.fullName}</p>
            <p className="text-xs text-slate-400 font-medium">{user.role}</p>
          </div>
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=10b981&color=fff`} 
            alt="User Avatar" 
            className="w-10 h-10 rounded-full ring-2 ring-slate-100 ring-offset-2"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
