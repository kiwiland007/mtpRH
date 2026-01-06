
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onShowProfile?: () => void;
  onShowSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onShowProfile, onShowSettings }) => {
  if (!user) return null; // Sécurité supplémentaire
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileMenu(false);
    if (onShowProfile) {
      onShowProfile();
    } else {
      alert(`Fonctionnalité "Mon Profil" : Accès en cours de déploiement pour votre agence.`);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileMenu(false);
    if (onShowSettings) {
      onShowSettings();
    } else {
      alert(`Fonctionnalité "Paramètres" : Accès en cours de déploiement pour votre agence.`);
    }
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileMenu(false);
    onLogout();
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-24 px-10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center md:hidden">
         <div className="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center font-black text-white mr-3">M</div>
         <span className="text-xl font-black tracking-tighter">MOUMEN <span className="text-rose-600">RH</span></span>
      </div>
      
      <div className="hidden md:block">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Rechercher une fonction..." 
            className="bg-slate-100 border-2 border-transparent rounded-2xl py-3 px-12 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-80 transition-all outline-none"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex items-center space-x-8">
        <button 
          type="button" 
          onClick={() => {
            // Ici vous pouvez ajouter un modal de notifications ou une fonctionnalité
            alert('Centre de notifications - Fonctionnalité à venir');
          }}
          className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-10 w-px bg-slate-200"></div>

        <div className="relative" ref={menuRef}>
          <button 
            type="button"
            className="flex items-center space-x-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all select-none outline-none border-none bg-transparent" 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{user.fullName}</p>
              <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">{user.role}</p>
            </div>
            <div className="relative">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=1e3a8a&color=fff&bold=true`} 
                alt="Avatar" 
                className="w-11 h-11 rounded-2xl shadow-lg shadow-indigo-100 ring-2 ring-white group-hover:ring-indigo-500 transition-all"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-slate-100 py-4 z-[100] animate-in overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 mb-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mon Agence</p>
                <p className="text-sm font-bold text-slate-700 mt-1">AXA Agent General</p>
              </div>
              <button 
                type="button"
                onClick={handleProfileClick}
                className="w-full text-left px-6 py-3 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Mon Profil
              </button>
              <button 
                type="button"
                onClick={handleSettingsClick}
                className="w-full text-left px-6 py-3 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Paramètres
              </button>
              <div className="h-px bg-slate-50 my-2 mx-6"></div>
              <button 
                type="button"
                onClick={handleLogoutClick}
                className="w-full text-left px-6 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
