import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';

// Enquanto o gate de validacao esta fechado, as rotas de mensagens
// redirecionam para o painel correspondente, sem expor tela nova.
const MessagingRoute: React.FC<{ destino: string; children: React.ReactNode }> = ({ destino, children }) => {
  const { disponivel, carregando } = useMessagingDisponivel();
  if (carregando) return null;
  if (!disponivel) return <Navigate to={destino} replace />;
  return <>{children}</>;
};

export default MessagingRoute;
