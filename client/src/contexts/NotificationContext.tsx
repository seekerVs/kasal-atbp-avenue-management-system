import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'danger' | 'warning' | 'info';

interface NotificationState {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
}

interface NotificationContextType {
  addNotification: (
    message: string,
    type: NotificationType,
    title?: string,
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
  notifications: NotificationState[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
};

// allow notification outside react
let notifyContextRef: NotificationContextType | undefined;

export const notify = (
  message: string,
  type: NotificationType,
  title?: string,
  duration?: number
) => {
  notifyContextRef?.addNotification?.(message, type, title, duration);
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (
      message: string,
      type: NotificationType,
      title?: string,
      duration: number = 5000
    ) => {
      const id = uuidv4();
      const newToast: NotificationState = { id, message, type, title };
      setNotifications((prev) => [...prev, newToast]);

      setTimeout(() => removeNotification(id), duration);
    },
    [removeNotification]
  );

  const contextValue: NotificationContextType = {
    addNotification,
    removeNotification,
    notifications,
  };

  notifyContextRef = contextValue;

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
