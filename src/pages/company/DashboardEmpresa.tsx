import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  FileText, 
  MessageSquare, 
  Search,
  Calendar,
  Star,
  TrendingUp,
  Plus,
  Eye,
  Download,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const DashboardEmpresa: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [stats, setStats] = useState({
    profissionaisContratados: 0,
    projetosAtivos: 0,
    mensagensNaoLidas: 0,
    avaliacaoMedia: 0
  });

  // Mock data - Em produção, buscar do Firebase
  const recentProfessionals = [
    {
      id: 1,
      nome: 'João Silva',
      especialidade: 'Técnico em Segurança do Trabalho',
      localizacao: 'São Paulo, SP',
      avaliacao: 4.9,
      status: 'Disponível'
    },
    {
      id: 2,
      nome: 'Maria Santos',
      especialidade: 'Engenheira de Segurança',
      localizacao: 'Rio de Janeiro, RJ',
      avaliacao: 4.8,
      status: 'Em projeto'
    }
  ];

  const activeProjects = [
    {
      id: 1,
      profissional: 'João Silva',
      servico: 'PCMSO - Programa de Controle Médico',
      inicio: '2024-01-10',
      prazo: '2024-02-15',
      progresso: 65
    },
    {
      id: 2,
      profissional: 'Maria Santos',
      servico: 'PPRA - Programa de Prevenção',
      inicio: '2024-01-05',
      prazo: '2024-01-30',
      progresso: 90
    }
  ];

  const recentMessages = [
    {
      id: 1,
      profissional: 'João Silva',
      mensagem: 'Cronograma atualizado para o PCMSO...',
      data: '2024-01-15',
      lida: false
    },
    {
      id: 2,
      profissional: 'Ana Costa',
      mensagem: 'Documentos enviados para análise...',
      data: '2024-01-14',
      lida: true
    }
  ];

  useEffect(() => {
    // Carregar estatísticas do Firebase
    setStats({
      profissionaisContratados: 8,
      projetosAtivos: 3,
      mensagensNaoLidas: 2,
      avaliacaoMedia: 4.7
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Bem-vindo(a), {userData?.nomeEmpresa || 'Empresa'}!
          </h1>
          <p className="font-roboto text-gray-600">
            Gerencie seus profissionais, projetos e contratos de SST.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-light rounded-lg flex items-center justify-center">
                <Users size={24} className="text-green-deep" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Profissionais</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.profissionaisContratados}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Projetos Ativos</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.projetosAtivos}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MessageSquare size={24} className="text-orange-600" />
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
                  to="/busca-profissionais"
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
                  to="/perfil-empresa"
                  variant="outline"
                  size="sm"
                  icon={Building2}
                  className="h-20 flex-col"
                >
                  Editar Empresa
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

            {/* Active Projects */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins font-semibold text-xl text-soft-black">
                  Projetos Ativos
                </h2>
                <Link
                  to="/contratos-empresa"
                  className="font-roboto text-green-deep hover:text-green-medium"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-4">
                {activeProjects.map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-poppins font-medium text-soft-black">
                        {project.servico}
                      </h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-roboto">
                        Em Andamento
                      </span>
                    </div>
                    <p className="font-roboto text-gray-600 mb-2">
                      Profissional: {project.profissional}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-roboto text-sm text-gray-500">
                        Prazo: {new Date(project.prazo).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-roboto text-sm text-gray-500">
                        {project.progresso}% concluído
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-medium h-2 rounded-full"
                        style={{ width: `${project.progresso}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
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
                <div className="flex items-center">
                  <Building2 size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    {userData?.segmento || 'Indústria'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    {userData?.numeroFuncionarios || '50-100'} funcionários
                  </span>
                </div>
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="font-roboto text-sm text-gray-600">
                    Próxima auditoria: Mar/2024
                  </span>
                </div>
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

            {/* Recent Messages */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Mensagens Recentes
                </h3>
                <Link
                  to="/mensagens-empresa"
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
                        {message.profissional}
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

            {/* Top Professionals */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Profissionais em Destaque
                </h3>
                <Link
                  to="/busca-profissionais"
                  className="font-roboto text-green-deep hover:text-green-medium text-sm"
                >
                  Ver mais
                </Link>
              </div>
              <div className="space-y-3">
                {recentProfessionals.map((professional) => (
                  <div key={professional.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-light rounded-full flex items-center justify-center">
                      <span className="font-poppins font-medium text-green-deep text-sm">
                        {professional.nome.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-roboto font-medium text-sm text-soft-black">
                        {professional.nome}
                      </h4>
                      <p className="font-roboto text-xs text-gray-600">
                        {professional.especialidade}
                      </p>
                      <div className="flex items-center mt-1">
                        <Star size={12} className="text-yellow-400 fill-current mr-1" />
                        <span className="font-roboto text-xs text-gray-500">
                          {professional.avaliacao}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmpresa;