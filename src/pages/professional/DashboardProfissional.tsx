import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  FileText, 
  MessageSquare, 
  Award, 
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  Briefcase,
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const DashboardProfissional: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalContratos: 0,
    avaliacaoMedia: 0,
    mensagensNaoLidas: 0,
    certificadosAtivos: 0
  });

  // Mock data - Em produção, buscar do Firebase
  const recentMessages = [
    {
      id: 1,
      empresa: 'TechCorp Ltda',
      mensagem: 'Gostaria de solicitar um orçamento para PCMSO...',
      data: '2024-01-15',
      lida: false
    },
    {
      id: 2,
      empresa: 'Indústria Moderna',
      mensagem: 'Preciso de apoio para elaboração de PPRA...',
      data: '2024-01-14',
      lida: true
    }
  ];

  const recentContracts = [
    {
      id: 1,
      empresa: 'Construtech',
      servico: 'PCMSO - Programa de Controle Médico',
      status: 'Em Andamento',
      valor: 'R$ 2.500,00',
      prazo: '2024-02-15'
    },
    {
      id: 2,
      empresa: 'Metalúrgica São Paulo',
      servico: 'PPRA - Programa de Prevenção',
      status: 'Concluído',
      valor: 'R$ 1.800,00',
      prazo: '2024-01-10'
    }
  ];

  useEffect(() => {
    // Carregar estatísticas do Firebase
    setStats({
      totalContratos: 12,
      avaliacaoMedia: 4.8,
      mensagensNaoLidas: 3,
      certificadosAtivos: 8
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Bem-vindo(a), {userData?.nome || 'Profissional'}!
          </h1>
          <p className="font-roboto text-gray-600">
            Gerencie seus contratos, certificados e oportunidades em um só lugar.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-light rounded-lg flex items-center justify-center">
                <Briefcase size={24} className="text-green-deep" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Contratos</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.totalContratos}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star size={24} className="text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Avaliação</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.avaliacaoMedia.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Mensagens</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.mensagensNaoLidas}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award size={24} className="text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Certificados</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.certificadosAtivos}
                </p>
              </div>
            </div>
          </div>
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
                  to="/perfil-profissional"
                  variant="outline"
                  size="sm"
                  icon={User}
                  className="h-20 flex-col"
                >
                  Editar Perfil
                </Button>
                <Button
                  as={Link}
                  to="/certificados"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  className="h-20 flex-col"
                >
                  Upload Docs
                </Button>
                <Button
                  as={Link}
                  to="/busca-empresas"
                  variant="outline"
                  size="sm"
                  icon={Eye}
                  className="h-20 flex-col"
                >
                  Buscar Empresas
                </Button>
                <Button
                  as={Link}
                  to="/downloads"
                  variant="outline"
                  size="sm"
                  icon={Download}
                  className="h-20 flex-col"
                >
                  Downloads
                </Button>
              </div>
            </div>

            {/* Recent Contracts */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins font-semibold text-xl text-soft-black">
                  Contratos Recentes
                </h2>
                <Link
                  to="/contratos-profissional"
                  className="font-roboto text-green-deep hover:text-green-medium"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-4">
                {recentContracts.map((contract) => (
                  <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-poppins font-medium text-soft-black">
                        {contract.empresa}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-roboto ${
                          contract.status === 'Em Andamento'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {contract.status}
                      </span>
                    </div>
                    <p className="font-roboto text-gray-600 mb-2">{contract.servico}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-roboto text-gray-500">
                        Prazo: {new Date(contract.prazo).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-poppins font-semibold text-green-deep">
                        {contract.valor}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Profile Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Meu Perfil
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    {userData?.cidade || 'São Paulo'}, {userData?.estado || 'SP'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Award size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    {userData?.especialidade || 'Técnico em Segurança do Trabalho'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    Disponível para novos projetos
                  </span>
                </div>
              </div>
              <Button
                as={Link}
                to="/perfil-profissional"
                variant="outline"
                size="sm"
                fullWidth
                className="mt-4"
              >
                Editar Perfil
              </Button>
            </div>

            {/* Recent Messages */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Mensagens Recentes
                </h3>
                <Link
                  to="/mensagens-profissional"
                  className="font-roboto text-green-deep hover:text-green-medium text-sm"
                >
                  Ver todas
                </Link>
              </div>
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div key={message.id} className="border-l-2 border-green-light pl-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-roboto font-medium text-sm text-soft-black">
                        {message.empresa}
                      </h4>
                      {!message.lida && (
                        <div className="w-2 h-2 bg-green-medium rounded-full"></div>
                      )}
                    </div>
                    <p className="font-roboto text-xs text-gray-600 mb-1">
                      {message.mensagem.length > 50
                        ? message.mensagem.substring(0, 50) + '...'
                        : message.mensagem}
                    </p>
                    <p className="font-roboto text-xs text-gray-400">
                      {new Date(message.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <TrendingUp size={20} className="text-green-deep mr-2" />
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Performance
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-roboto text-gray-600">Perfil Completo</span>
                    <span className="font-roboto text-gray-900">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-medium h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-roboto text-gray-600">Taxa de Resposta</span>
                    <span className="font-roboto text-gray-900">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-roboto text-gray-600">Satisfação Cliente</span>
                    <span className="font-roboto text-gray-900">96%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfissional;