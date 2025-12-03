
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification } from '@/types/notification';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "quiz_ready",
      message: "📚 Your customized quick quiz on Loops and Recursion is ready!",
      timestamp: "5 minutes ago",
      read: false
    },
    {
      id: "2",
      type: "midterm_review",
      message: "✅ Your Biology mid-term has been analyzed — 3 weak areas found.",
      timestamp: "1 hour ago",
      read: false
    },
    {
      id: "3",
      type: "study_tip",
      message: "💡 Study Tip: Focus on active recall, not passive rereading.",
      timestamp: "2 hours ago",
      read: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
