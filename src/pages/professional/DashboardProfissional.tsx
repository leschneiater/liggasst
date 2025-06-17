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
  Download,
  Upload,
  Crown,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Target,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const DashboardProfissional: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalContratos: 0,
    avaliacaoMedia: 0,
    mensagensNaoLidas: 0,
    certificadosAtivos: 0,
    empresasVisualizando: 0,
    convitesAbertos: 0,
    perfilCompleto: 0,
    statusVerificacao: 'pendente',
    pontuacaoRanking: 0
  });

  const [currentPlan, setCurrentPlan] = useState('gratuito');

  // Mock data - Em produção, buscar do Firebase/Supabase
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
    },
    {
      id: 3,
      empresa: 'Construtech',
      mensagem: 'Quando podemos agendar uma visita técnica?',
      data: '2024-01-13',
      lida: false
    }
  ];

  const recentContracts = [
    {
      id: 1,
      empresa: 'Construtech',
      servico: 'PCMSO - Programa de Controle Médico',
      status: 'Em Andamento',
      valor: 'R$ 2.500,00',
      prazo: '2024-02-15',
      progresso: 65
    },
    {
      id: 2,
      empresa: 'Metalúrgica São Paulo',
      servico: 'PPRA - Programa de Prevenção',
      status: 'Concluído',
      valor: 'R$ 1.800,00',
      prazo: '2024-01-10',
      progresso: 100
    }
  ];

  const empresasInteressadas = [
    {
      id: 1,
      nome: 'Indústria ABC',
      segmento: 'Metalúrgica',
      funcionarios: '150',
      localizacao: 'São Paulo, SP',
      interesse: 'PCMSO'
    },
    {
      id: 2,
      nome: 'Construtora XYZ',
      segmento: 'Construção Civil',
      funcionarios: '80',
      localizacao: 'Rio de Janeiro, RJ',
      interesse: 'NR-35'
    }
  ];

  useEffect(() => {
    // Carregar estatísticas do Firebase/Supabase
    setStats({
      totalContratos: 12,
      avaliacaoMedia: 4.8,
      mensagensNaoLidas: 3,
      certificadosAtivos: 8,
      empresasVisualizando: 24,
      convitesAbertos: 5,
      perfilCompleto: 85,
      statusVerificacao: 'aprovado',
      pontuacaoRanking: 1250
    });
  }, []);

  const getVerificationStatus = () => {
    switch (stats.statusVerificacao) {
      case 'aprovado':
        return { icon: CheckCircle, color: 'text-green-600', text: 'Verificado' };
      case 'pendente':
        return { icon: Clock, color: 'text-yellow-600', text: 'Em Análise' };
      case 'rejeitado':
        return { icon: AlertCircle, color: 'text-red-600', text: 'Rejeitado' };
      default:
        return { icon: Clock, color: 'text-gray-600', text: 'Não Enviado' };
    }
  };

  const verificationStatus = getVerificationStatus();

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bloco de Boas-vindas */}
        <div className="bg-gradient-to-r from-green-deep to-green-medium text-white p-8 rounded-2xl mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="font-poppins font-bold text-3xl mb-2">
                Olá, {userData?.nome || 'Profissional'}! Bem-vindo ao seu painel LiggaSST.
              </h1>
              <p className="font-roboto text-green-light text-lg">
                Gerencie seus contratos, certificados e oportunidades em um só lugar.
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Crown size={20} className="text-green-light" />
                <span className="font-poppins font-semibold text-green-light">
                  Plano {currentPlan === 'gratuito' ? 'Gratuito' : 'Profissional'}
                </span>
              </div>
              {currentPlan === 'gratuito' ? (
                <Button 
                  as={Link}
                  to="/assinatura-profissional"
                  size="sm"
                  className="bg-green-light text-green-deep hover:bg-white"
                >
                  Assinar Agora
                </Button>
              ) : (
                <Button 
                  as={Link}
                  to="/assinatura-profissional"
                  variant="outline"
                  size="sm"
                  className="border-white text-white hover:bg-white hover:text-green-deep"
                >
                  Ver meus planos
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Área de Ações Rápidas */}
        <div className="mb-8">
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button
              as={Link}
              to="/perfil-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <User size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Atualizar Perfil</span>
            </Button>
            <Button
              as={Link}
              to="/certificados"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <Upload size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Enviar Documentos</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
              onClick={() => document.getElementById('empresas-interessadas')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Building2 size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Empresas Interessadas</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <Star size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Minhas Avaliações</span>
            </Button>
            <Button
              as={Link}
              to="/contratos-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <FileText size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Histórico Contratos</span>
            </Button>
            <Button
              as={Link}
              to="/mensagens-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium relative"
            >
              <MessageSquare size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Central Mensagens</span>
              {stats.mensagensNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.mensagensNaoLidas}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Meu Status na Plataforma */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-6">
                Meu Status na Plataforma
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Perfil Completo */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Perfil Completo</span>
                    <span className="font-poppins font-bold text-green-deep">{stats.perfilCompleto}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-medium h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.perfilCompleto}%` }}
                    ></div>
                  </div>
                  <p className="font-roboto text-xs text-gray-600 mt-1">
                    Complete seu perfil para receber mais oportunidades
                  </p>
                </div>

                {/* Status Verificação */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Verificação</span>
                    <div className="flex items-center space-x-1">
                      <verificationStatus.icon size={16} className={verificationStatus.color} />
                      <span className={`font-roboto text-sm ${verificationStatus.color}`}>
                        {verificationStatus.text}
                      </span>
                    </div>
                  </div>
                  <p className="font-roboto text-xs text-gray-600">
                    {stats.statusVerificacao === 'aprovado' 
                      ? 'Seus documentos foram verificados'
                      : 'Envie seus documentos para verificação'
                    }
                  </p>
                </div>

                {/* Pontuação Ranking */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Ranking</span>
                    <span className="font-poppins font-bold text-purple-600">{stats.pontuacaoRanking} pts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={12} className="text-purple-600" />
                    <span className="font-roboto text-xs text-gray-600">
                      Top 15% dos profissionais
                    </span>
                  </div>
                </div>

                {/* Avaliação Média */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Avaliação</span>
                    <div className="flex items-center space-x-1">
                      <Star size={16} className="text-yellow-400 fill-current" />
                      <span className="font-poppins font-bold text-yellow-600">{stats.avaliacaoMedia}</span>
                    </div>
                  </div>
                  <p className="font-roboto text-xs text-gray-600">
                    Baseado em {stats.totalContratos} contratos
                  </p>
                </div>
              </div>
            </div>

            {/* Indicadores Resumidos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-6">
                Indicadores
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Eye size={20} className="text-blue-600" />
                  </div>
                  <p className="font-poppins font-bold text-2xl text-blue-600">{stats.empresasVisualizando}</p>
                  <p className="font-roboto text-xs text-gray-600">Empresas visualizando</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Briefcase size={20} className="text-green-600" />
                  </div>
                  <p className="font-poppins font-bold text-2xl text-green-600">{stats.convitesAbertos}</p>
                  <p className="font-roboto text-xs text-gray-600">Convites abertos</p>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MessageSquare size={20} className="text-orange-600" />
                  </div>
                  <p className="font-poppins font-bold text-2xl text-orange-600">{stats.mensagensNaoLidas}</p>
                  <p className="font-roboto text-xs text-gray-600">Mensagens novas</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={20} className="text-purple-600" />
                  </div>
                  <p className="font-poppins font-bold text-2xl text-purple-600">{stats.totalContratos}</p>
                  <p className="font-roboto text-xs text-gray-600">Contratos finalizados</p>
                </div>
              </div>
            </div>

            {/* Contratos Recentes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
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
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-roboto text-gray-500">
                        Prazo: {new Date(contract.prazo).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-poppins font-semibold text-green-deep">
                        {contract.valor}
                      </span>
                    </div>
                    {contract.status === 'Em Andamento' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-roboto text-gray-600">Progresso</span>
                          <span className="font-roboto text-gray-900">{contract.progresso}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-medium h-2 rounded-full"
                            style={{ width: `${contract.progresso}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Upload de Documentos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Upload de Documentos
              </h3>
              
              <div className="border-2 border-dashed border-green-light rounded-lg p-6 text-center mb-4">
                <Upload size={32} className="mx-auto mb-2 text-green-deep" />
                <p className="font-roboto text-sm text-gray-600 mb-2">
                  Envie seus certificados
                </p>
                <Button 
                  as={Link}
                  to="/certificados"
                  size="sm" 
                  icon={Plus}
                >
                  Enviar novo certificado
                </Button>
              </div>
              
              <div className="text-xs font-roboto text-gray-500 space-y-1">
                <p>• Tipos aceitos: PDF, JPG, PNG</p>
                <p>• Campos: Tipo, Validade, Descrição</p>
                <p>• Máximo 10MB por arquivo</p>
              </div>
            </div>

            {/* Minhas Assinaturas */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Minhas Assinaturas
              </h3>
              
              <div className="bg-neutral-gray p-4 rounded-lg mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown size={16} className="text-green-deep" />
                  <span className="font-poppins font-medium text-soft-black">
                    Plano {currentPlan === 'gratuito' ? 'Gratuito' : 'Profissional'}
                  </span>
                </div>
                <p className="font-roboto text-xs text-gray-600 mb-3">
                  {currentPlan === 'gratuito' 
                    ? 'Upgrade para recursos premium'
                    : 'Acesso completo aos recursos'
                  }
                </p>
                {currentPlan === 'gratuito' && (
                  <Button 
                    as={Link}
                    to="/assinatura-profissional"
                    size="sm" 
                    fullWidth
                    icon={Zap}
                  >
                    Assinar Plano Profissional
                  </Button>
                )}
              </div>
              
              {currentPlan === 'gratuito' && (
                <div className="bg-green-light bg-opacity-20 p-3 rounded-lg">
                  <h4 className="font-poppins font-semibold text-green-deep text-sm mb-2">
                    Benefícios Premium:
                  </h4>
                  <ul className="font-roboto text-xs text-green-deep space-y-1">
                    <li>• Contatos ilimitados</li>
                    <li>• Selo de verificado</li>
                    <li>• Destaque nas buscas</li>
                    <li>• Relatórios detalhados</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Empresas Interessadas */}
            <div id="empresas-interessadas" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Empresas Interessadas
                </h3>
                <span className="bg-green-medium text-white text-xs px-2 py-1 rounded-full">
                  {empresasInteressadas.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {empresasInteressadas.map((empresa) => (
                  <div key={empresa.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-poppins font-medium text-sm text-soft-black">
                        {empresa.nome}
                      </h4>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {empresa.interesse}
                      </span>
                    </div>
                    <p className="font-roboto text-xs text-gray-600 mb-1">
                      {empresa.segmento} • {empresa.funcionarios} funcionários
                    </p>
                    <p className="font-roboto text-xs text-gray-500 mb-2">
                      {empresa.localizacao}
                    </p>
                    <Button size="sm" fullWidth className="text-xs">
                      Ver Detalhes
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mensagens Recentes */}
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
                {recentMessages.slice(0, 3).map((message) => (
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
                      {message.mensagem.length > 40
                        ? message.mensagem.substring(0, 40) + '...'
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
                <BarChart3 size={20} className="text-green-deep mr-2" />
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  Performance
                </h3>
              </div>
              <div className="space-y-4">
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
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-roboto text-gray-600">Pontualidade</span>
                    <span className="font-roboto text-gray-900">98%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
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