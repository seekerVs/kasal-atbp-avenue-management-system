import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../contexts/AlertContext';

// Set the timeout duration in milliseconds (e.g., 15 minutes)
const TIMEOUT_DURATION = 15 * 60 * 1000;

let timeoutId: number;

export const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    // We add state to the navigation so the sign-in page can show a message
    navigate('/signIn', { state: { from: 'inactivity' } });
    addAlert('You have been logged out due to inactivity.', 'info');
  }, [navigate, addAlert]);

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