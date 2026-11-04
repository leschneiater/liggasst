import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'professional' | 'company' | 'admin' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const { currentUser, userType: currentUserType, loading } = useAuth();
  const location = useLocation();

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

  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!currentUser.verified) {
    return <Navigate to="/auth/login" replace />;
  }

  // Conta OAuth sem papel definido: completa o cadastro antes de usar a
  // plataforma. A propria rota /auth/completar-cadastro e a excecao (senao
  // o redirecionamento apontaria para si mesma em loop).
  if (
    currentUser.statusVerificacao === 'awaiting_completion' &&
    !location.pathname.endsWith('/auth/completar-cadastro')
  ) {
    return <Navigate to="/auth/completar-cadastro" replace />;
  }

  if (userType && currentUserType !== userType) {
    // Redirect to appropriate dashboard based on user type
    if (currentUserType === 'professional') {
      return <Navigate to="/dashboard-profissional" replace />;
    } else if (currentUserType === 'company') {
      return <Navigate to="/dashboard-empresa" replace />;
    } else if (currentUserType === 'employee') {
      return <Navigate to="/minha-capacitacao" replace />;
    } else if (currentUserType === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
