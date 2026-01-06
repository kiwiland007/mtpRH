
import React, { useState, useEffect } from 'react';

interface NotificationCenterProps {
  notifications: string[];
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications }) => {
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      setCurrentNotification(notifications[0]);
      const timer = setTimeout(() => setCurrentNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!currentNotification) return null;

  return (
    <div 
      className="fixed bottom-8 right-8 z-[9999] animate-in pointer-events-none" 
      style={{ 
        animation: 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)] border border-white/10 flex items-start space-x-4 max-w-sm pointer-events-auto">
        <div className="bg-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-0.5">Notification Système</p>
          <p className="text-slate-200 text-sm font-medium leading-snug">{currentNotification}</p>
        </div>
        <button 
          type="button"
          onClick={() => setCurrentNotification(null)} 
          className="text-slate-500 hover:text-white transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
