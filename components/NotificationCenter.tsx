
import React, { useState, useEffect, useRef } from 'react';

interface NotificationCenterProps {
  notifications: string[];
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Array<{id: string, message: string, timer: NodeJS.Timeout}>>([]);
  const notificationIdRef = useRef(0);

  const previousNotificationsRef = useRef<string[]>([]);

  useEffect(() => {
    // Nettoyer tous les timers existants avant d'ajouter de nouvelles notifications
    visibleNotifications.forEach(notification => {
      clearTimeout(notification.timer);
    });

    // Détecter les nouvelles notifications en comparant avec les précédentes
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      const previousLatest = previousNotificationsRef.current[0];

      // Si c'est une nouvelle notification (différente de la précédente)
      if (latestNotification && latestNotification !== previousLatest) {
        const id = `notif-${notificationIdRef.current++}`;

        // Ajouter la nouvelle notification
        const newNotification = {
          id,
          message: latestNotification,
          timer: setTimeout(() => {
            setVisibleNotifications(prev => prev.filter(n => n.id !== id));
          }, 5000)
        };

        setVisibleNotifications(prev => {
          // Garder seulement les 3 plus récentes
          return [newNotification, ...prev.slice(0, 2)];
        });
      }

      // Mettre à jour la référence
      previousNotificationsRef.current = [...notifications];
    } else {
      // Si notifications est vide, réinitialiser la référence et les notifications visibles
      previousNotificationsRef.current = [];
      setVisibleNotifications([]);
    }
  }, [notifications]);

  const removeNotification = (id: string) => {
    setVisibleNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification) {
        clearTimeout(notification.timer);
      }
      return prev.filter(n => n.id !== id);
    });
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] pointer-events-none space-y-3">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)] border border-white/10 flex items-start space-x-4 max-w-sm pointer-events-auto animate-in"
          style={{ 
            animationDelay: `${index * 0.1}s`
          }}
        >
          <div className="bg-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-0.5">Notification Système</p>
            <p className="text-slate-200 text-sm font-medium leading-snug break-words">{notification.message}</p>
          </div>
          <button 
            type="button"
            onClick={() => removeNotification(notification.id)}
            className="text-slate-500 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
