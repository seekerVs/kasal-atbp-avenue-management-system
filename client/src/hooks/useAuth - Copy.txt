// client/src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { AUTH_CHANGE_EVENT } from '../services/authEvent'; // <-- IMPORT OUR EVENT NAME

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('authToken');
  });

  useEffect(() => {
    // This handler will now be called by our custom event
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('authToken'));
    };

    // Listen for our custom event
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    
    // Also keep the 'storage' event listener to sync across different tabs
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return { isAuthenticated, setIsAuthenticated };
};