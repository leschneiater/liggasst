import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallback = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      navigate('/auth/login', { replace: true });
      return;
    }

    const destination = currentUser.type === 'company'
      ? '/dashboard-empresa'
      : currentUser.type === 'admin'
        ? '/admin'
        : '/dashboard-profissional';
    navigate(destination, { replace: true });
  }, [currentUser, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-gray">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4" />
        <p className="font-roboto text-gray-600">Confirmando sua conta...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
