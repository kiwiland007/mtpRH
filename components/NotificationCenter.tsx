
import React, { useState, useEffect } from 'react';

interface NotificationCenterProps {
  notifications: string[];
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!visible || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-bounce-in">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start space-x-4 max-w-sm">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Notification Système</p>
          <p className="text-slate-400 text-xs mt-1">{notifications[0]}</p>
        </div>
        <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
