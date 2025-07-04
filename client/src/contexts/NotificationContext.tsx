import React, { createContext, useState, useContext, ReactNode } from 'react';

type NotificationType = 'success' | 'danger' | 'warning' | 'info';

interface NotificationState {
  message: string;
  type: NotificationType;
  id: number;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
  notifications: NotificationState[];
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Automatically remove the notification after a delay
    setTimeout(() => {
      removeNotification(id);
    }, 5000); // 5 second timeout
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};