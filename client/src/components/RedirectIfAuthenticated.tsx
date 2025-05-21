// src/components/RedirectIfAuthenticated.tsx
import React, { JSX, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RedirectIfAuthenticatedProps {
  children: JSX.Element; // The component to render if NOT authenticated
  redirectTo: string;     // The path to redirect to if authenticated
}

const RedirectIfAuthenticated: React.FC<RedirectIfAuthenticatedProps> = ({ children, redirectTo }) => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("authToken"); // Check for the token

  useEffect(() => {
    if (isAuthenticated) {
      // If authenticated, redirect to the specified path
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  // Only render children if NOT authenticated, otherwise null (as we're redirecting)
  return isAuthenticated ? null : children;
};

export default RedirectIfAuthenticated;