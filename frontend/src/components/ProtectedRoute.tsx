import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isInitialized, initAuth } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isInitialized: state.isInitialized,
    initAuth: state.initAuth,
  }));

  useEffect(() => {
    if (!isInitialized) {
      initAuth();
    }
  }, [initAuth, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

