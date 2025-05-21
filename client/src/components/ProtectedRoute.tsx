// src/components/ProtectedRoute.tsx
import React, { JSX, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: JSX.Element; // The component to render if authenticated
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("authToken"); // Check for the token

  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated, redirect to the sign-in page
      navigate("/signIn", { replace: true }); // `replace: true` prevents going back to the protected route via browser back button
    }
  }, [isAuthenticated, navigate]); // Re-run effect if isAuthenticated status changes

  // Only render children if authenticated, otherwise null (as we're redirecting)
  return isAuthenticated ? children : null;
};

export default ProtectedRoute;