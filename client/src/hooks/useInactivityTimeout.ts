// client/src/hooks/useInactivityTimeout.ts
import { useEffect, useCallback, useRef } from 'react';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 Minutes

export const useInactivityTimeout = (enabled: boolean) => {
  // Use a ref to store the timer ID so it persists across renders
  // but is unique to this specific hook instance.
  const timeoutIdRef = useRef<number | undefined>(undefined);

  const logout = useCallback(() => {
    // 1. Remove token
    localStorage.removeItem('authToken');
    // 2. Force full page reload to clear memory/state and go to sign in
    window.location.replace('/signIn?reason=inactivity');
  }, []);

  const startTimer = useCallback(() => {
    // Clear existing timer if one exists
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
    }
    // Set a new timer
    timeoutIdRef.current = window.setTimeout(logout, TIMEOUT_DURATION);
  }, [logout]);

  useEffect(() => {
    // If the hook is disabled (user not logged in), clear timer and do nothing.
    if (!enabled) {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      return;
    }

    // List of events that reset the timer
    // Note: 'keydown' is preferred over 'keypress'
    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keydown'];
    
    // Initial start
    startTimer();

    // Event handler
    const handleActivity = () => {
      startTimer();
    };

    // Attach listeners
    for (const event of events) {
      window.addEventListener(event, handleActivity);
    }

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, startTimer]);
};