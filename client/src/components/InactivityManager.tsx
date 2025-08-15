// client/src/components/InactivityManager.tsx
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { useAuth } from '../hooks/useAuth';

export const InactivityManager = () => {
  const { isAuthenticated } = useAuth();
  
  // Only activate the timeout hook if the user is authenticated
  useInactivityTimeout(isAuthenticated);

  return null; // This component renders nothing
};