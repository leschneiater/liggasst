import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  FileText,
  Award,
  User,
  Crown
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard-profissional', label: 'Painel', icon: LayoutDashboard },
  { path: '/demandas-disponiveis', label: 'Demandas', icon: Search },
  { path: '/busca-empresas', label: 'Buscar Empresas', icon: Search },
  { path: '/mensagens-profissional', label: 'Mensagens', icon: MessageSquare },
  { path: '/contratos-profissional', label: 'Contratos', icon: FileText },
  { path: '/certificados', label: 'Certificados', icon: Award },
  { path: '/perfil-profissional', label: 'Perfil', icon: User },
  { path: '/assinatura-profissional', label: 'Assinatura', icon: Crown },
];

export const professionalAreaPaths: string[] = menuItems.map((item) => item.path);

const ProfessionalAreaNav: React.FC = () => {
  const location = useLocation();
  const { disponivel: mensagensDisponivel } = useMessagingDisponivel();
  const itensVisiveis = menuItems.filter(
    (item) => item.path !== '/mensagens-profissional' || mensagensDisponivel
  );
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // Keep the active item visible inside the horizontal scroll on small screens
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  return (
    <nav
      className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm"
      aria-label="Menu do profissional"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {itensVisiveis.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                ref={isActive ? activeRef : undefined}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center space-x-2 px-3 py-3 text-sm font-roboto font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
                  isActive
                    ? 'border-green-deep text-green-deep'
                    : 'border-transparent text-gray-600 hover:text-green-deep hover:border-green-medium'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ProfessionalAreaNav;
