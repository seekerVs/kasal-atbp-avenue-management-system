import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { v4 as uuidv4 } from 'uuid';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

interface AlertState {
  id: string;
  message: string | string[];
  type: AlertType;
}

interface AlertContextType {
  addAlert: (message: string | string[], type: AlertType) => void; // <-- THIS IS THE CHANGE
  removeAlert: (id: string) => void;
  alerts: AlertState[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<AlertState[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addAlert = useCallback(
    (message: string | string[], type: AlertType, duration: number = 5000) => {
      const id = uuidv4();
      const newAlert: AlertState = { id, message, type };
      setAlerts((prev) => [newAlert, ...prev]); // Add new alerts to the top

      setTimeout(() => removeAlert(id), duration);
    },
    [removeAlert]
  );

  const contextValue: AlertContextType = {
    addAlert,
    removeAlert,
    alerts,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
};