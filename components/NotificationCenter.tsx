
import React, { useState, useEffect, useRef } from 'react';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const lastFetchedRef = useRef<string>(new Date().toISOString());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      try {
        const data = await notificationService.fetchNotifications(userId);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    loadNotifications();

    const interval = setInterval(async () => {
      try {
        const data = await notificationService.fetchNotifications(userId);
        const newNotifs = data.filter(n => new Date(n.created_at) > new Date(lastFetchedRef.current));
        if (newNotifs.length > 0) {
          setToasts(prev => [...newNotifs, ...prev]);
          newNotifs.forEach(n => {
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== n.id));
            }, 5000);
          });
          lastFetchedRef.current = new Date().toISOString();
        }
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (e) {
        console.warn('Polling error', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [userId]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-[1000] pointer-events-none space-y-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-start space-x-4 max-w-sm pointer-events-auto animate-in">
            <div className={`p-2.5 rounded-xl shadow-lg flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-rose-500' :
                  toast.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
              }`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-0.5">{toast.title || 'Notification'}</p>
              <p className="text-slate-200 text-sm font-medium leading-snug break-words">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div
          ref={containerRef}
          className="fixed top-24 right-40 w-96 bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in z-[101]"
        >
          <div className="p-6 bg-slate-950 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black tracking-tighter">Notifications</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} non lues</p>
            </div>
            <button onClick={markAllAsRead} className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">Tout marquer lu</button>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length > 0 ? notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-5 hover:bg-slate-50 transition-all cursor-pointer flex gap-4 ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notif.is_read ? 'bg-indigo-600' : 'bg-transparent'}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 leading-tight mb-1">{notif.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">{notif.message}</p>
                  <p className="text-[10px] font-medium text-slate-400">{new Date(notif.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p className="text-sm font-bold uppercase tracking-widest">Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
