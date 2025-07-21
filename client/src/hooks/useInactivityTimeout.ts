import { useEffect, useCallback } from 'react';

// Set the timeout duration in milliseconds (e.g., 15 minutes)
const TIMEOUT_DURATION = 15 * 60 * 1000;

let timeoutId: number;

export const useInactivityTimeout = () => {

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    // Navigate with a full page reload and add a query parameter
    // so the sign-in page knows why the user is there.
    window.location.replace('/signIn?reason=inactivity');
  }, []);

  const resetTimeout = useCallback(() => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(logout, TIMEOUT_DURATION);
  }, [logout]);

  useEffect(() => {
    // List of events that indicate user activity
    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];

    // Set the initial timeout
    resetTimeout();

    // Add event listeners to reset the timeout on any user activity
    for (const event of events) {
      window.addEventListener(event, resetTimeout);
    }

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetTimeout);
      }
      clearTimeout(timeoutId);
    };
  }, [resetTimeout]);

  return null; // This hook doesn't need to return anything
};