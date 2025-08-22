// client/src/hooks/useInactivityTimeout.ts
import { useEffect, useCallback } from 'react';

const TIMEOUT_DURATION = 15 * 60 * 1000;
let timeoutId: number;

// The hook now accepts an 'enabled' flag
export const useInactivityTimeout = (enabled: boolean) => {
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    window.location.replace('/signIn?reason=inactivity');
  }, []);

  const resetTimeout = useCallback(() => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(logout, TIMEOUT_DURATION);
  }, [logout]);

  useEffect(() => {
    // If the hook is not enabled (e.g., user is logged out), do nothing and clean up.
    if (!enabled) {
      clearTimeout(timeoutId);
      return;
    }

    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
    resetTimeout();
    for (const event of events) {
      window.addEventListener(event, resetTimeout);
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetTimeout);
      }
      clearTimeout(timeoutId);
    };
  }, [resetTimeout, enabled]); // Add 'enabled' to the dependency array
};