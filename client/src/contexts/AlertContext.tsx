import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useRef, // <-- 1. Import useRef
} from 'react';
import { v4 as uuidv4 } from 'uuid';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

// --- 2. UPDATE AlertState ---
// Add properties for pausing and tracking the timer
interface AlertState {
  id: string;
  message: string | string[];
  type: AlertType;
  startTime: number;      // When the alert was created
  remainingTime: number;  // The duration left
  isPaused: boolean;      // Is the timer paused by hover?
}

interface AlertContextType {
  addAlert: (message: string | string[], type: AlertType) => void;
  removeAlert: (id: string) => void;
  pauseAlertTimer: (id: string) => void;   // <-- 3. ADD new function
  resumeAlertTimer: (id: string) => void;  // <-- 3. ADD new function
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
  // --- 4. USE a ref to store timer IDs ---
  const alertTimers = useRef<Map<string, number>>(new Map());

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((n) => n.id !== id));
    // Clear any existing timer for this alert when it's removed
    clearTimeout(alertTimers.current.get(id));
    alertTimers.current.delete(id);
  }, []);

  const addAlert = useCallback(
    (message: string | string[], type: AlertType, duration: number = 5000) => {
      const id = uuidv4();
      const startTime = Date.now();
      const newAlert: AlertState = {
        id,
        message,
        type,
        startTime,
        remainingTime: duration,
        isPaused: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);

      const timer = setTimeout(() => removeAlert(id), duration);
      alertTimers.current.set(id, timer);
    },
    [removeAlert]
  );
  
  // --- 5. IMPLEMENT the pause and resume functions ---
  const pauseAlertTimer = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === id && !alert.isPaused) {
        clearTimeout(alertTimers.current.get(id));
        const elapsedTime = Date.now() - alert.startTime;
        const remainingTime = alert.remainingTime - elapsedTime;
        return { ...alert, isPaused: true, remainingTime };
      }
      return alert;
    }));
  }, []);

  const resumeAlertTimer = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === id && alert.isPaused) {
        const newStartTime = Date.now();
        const timer = setTimeout(() => removeAlert(id), alert.remainingTime);
        alertTimers.current.set(id, timer);
        return { ...alert, isPaused: false, startTime: newStartTime };
      }
      return alert;
    }));
  }, [removeAlert]);

  const contextValue: AlertContextType = {
    addAlert,
    removeAlert,
    alerts,
    pauseAlertTimer,
    resumeAlertTimer,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
};