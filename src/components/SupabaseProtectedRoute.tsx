import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'professional' | 'company' | 'admin';
}

const SupabaseProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const { user, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
          <p className="font-roboto text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (userType && user.type !== userType) {
    if (user.type === 'professional') {
      return <Navigate to="/dashboard-profissional" replace />;
    } else if (user.type === 'company') {
      return <Navigate to="/dashboard-empresa" replace />;
    } else if (user.type === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SupabaseProtectedRoute;
