import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Search,
  Plus,
  BarChart3,
  GraduationCap,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import { fetchDemands } from '../../services/database';
import Button from '../../components/ui/Button';

interface DemandaRow {
  id: string;
  title: string;
  service_type: string | null;
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
}

const statusDemanda: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const DashboardEmpresa: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const { disponivel: msgDisponivel } = useMessagingDisponivel();
  const [demands, setDemands] = useState<DemandaRow[]>([]);
  const [demandsLoading, setDemandsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setDemandsLoading(true);
    fetchDemands({ company_id: currentUser.id })
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setDemands(result.data as DemandaRow[]);
        }
      })
      .finally(() => setDemandsLoading(false));
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Bem-vindo(a), {userData?.nomeEmpresa || 'Empresa'}!
          </h1>
          <p className="font-roboto text-gray-600">
            Gerencie o perfil da sua empresa e acompanhe suas demandas de SST.
          </p>
        </div>

        {/* Minhas Demandas (dados reais) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins font-semibold text-xl text-soft-black">
              Minhas Demandas
            </h2>
            <Button as={Link} to="/publique-demanda" variant="outline" size="sm" icon={Plus}>
              Nova Demanda
            </Button>
          </div>
          {demandsLoading ? (
            <p className="font-roboto text-gray-500 text-sm">Carregando demandas...</p>
          ) : demands.length === 0 ? (
            <p className="font-roboto text-gray-500 text-sm">
              Nenhuma demanda publicada ainda. Publique a primeira para encontrar profissionais.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {demands.map((demanda) => (
                <li key={demanda.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-roboto font-medium text-soft-black">{demanda.title}</p>
                    <p className="font-roboto text-sm text-gray-500">
                      {[demanda.service_type, [demanda.city, demanda.state].filter(Boolean).join(', ')]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-1 text-xs font-roboto rounded-full bg-green-light text-green-deep">
                      {statusDemanda[demanda.status] ?? demanda.status}
                    </span>
                    <p className="font-roboto text-xs text-gray-400 mt-1">
                      {new Date(demanda.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  as={Link}
                  to="/busca-profissionais-empresa"
                  variant="outline"
                  size="sm"
                  icon={Search}
                  className="h-20 flex-col"
                >
                  Buscar Profissionais
                </Button>
                <Button
                  as={Link}
                  to="/relatorios"
                  variant="outline"
                  size="sm"
                  icon={BarChart3}
                  className="h-20 flex-col"
                >
                  Relatórios
                </Button>
                <Button
                  as={Link}
                  to="/treinamentos-empresa"
                  variant="outline"
                  size="sm"
                  icon={GraduationCap}
                  className="h-20 flex-col"
                >
                  Treinamentos
                </Button>
                <Button
                  as={Link}
                  to="/perfil-empresa"
                  variant="outline"
                  size="sm"
                  icon={Building2}
                  className="h-20 flex-col"
                >
                  Editar Empresa
                </Button>
                {msgDisponivel && (
                  <Button
                    as={Link}
                    to="/mensagens-empresa"
                    variant="outline"
                    size="sm"
                    icon={MessageSquare}
                    className="h-20 flex-col"
                  >
                    Central Mensagens
                  </Button>
                )}
              </div>
            </div>

            {/* Áreas em implantação */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                Em implantação
              </h2>
              <p className="font-roboto text-sm text-gray-600">
                Contratos e gestão de projetos ainda estão sendo preparados. Quando cada área estiver ativa, ela aparecerá aqui no painel da empresa, sem dados de exemplo.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Company Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Informações da Empresa
              </h3>
              <div className="space-y-3">
                {userData?.segmento && (
                  <div className="flex items-center">
                    <Building2 size={16} className="text-gray-400 mr-2" />
                    <span className="font-roboto text-sm text-gray-600">
                      {userData.segmento}
                    </span>
                  </div>
                )}
                {userData?.numeroFuncionarios && (
                  <div className="flex items-center">
                    <Users size={16} className="text-gray-400 mr-2" />
                    <span className="font-roboto text-sm text-gray-600">
                      {userData.numeroFuncionarios} funcionários
                    </span>
                  </div>
                )}
                {!userData?.segmento && !userData?.numeroFuncionarios && (
                  <p className="font-roboto text-sm text-gray-500">
                    Complete as informações da empresa no perfil.
                  </p>
                )}
              </div>
              <Button
                as={Link}
                to="/perfil-empresa"
                variant="outline"
                size="sm"
                fullWidth
                className="mt-4"
              >
                Editar Informações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmpresa;
