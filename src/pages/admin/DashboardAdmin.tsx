import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Star,
  Activity,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Search,
  Eye,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';

const DashboardAdmin: React.FC = () => {
  const [stats, setStats] = useState({
    totalProfissionais: 0,
    totalEmpresas: 0,
    contratosAtivos: 0,
    receitaMensal: 0,
    crescimentoMensal: 0,
    denunciasAbertas: 0,
    usuariosAtivos: 0,
    transacoes: 0
  });

  const [timeFilter, setTimeFilter] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'new_professional',
      description: 'Novo profissional cadastrado: João Silva',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'success'
    },
    {
      id: 2,
      type: 'new_company',
      description: 'Nova empresa cadastrada: TechCorp Ltda',
      timestamp: '2024-01-15T09:15:00Z',
      status: 'success'
    },
    {
      id: 3,
      type: 'contract_signed',
      description: 'Contrato assinado entre Maria Santos e Indústria XYZ',
      timestamp: '2024-01-15T08:45:00Z',
      status: 'success'
    },
    {
      id: 4,
      type: 'payment_received',
      description: 'Pagamento recebido: R$ 149,00 - Plano Business',
      timestamp: '2024-01-15T08:00:00Z',
      status: 'success'
    },
    {
      id: 5,
      type: 'report_issue',
      description: 'Denúncia reportada: Comportamento inadequado',
      timestamp: '2024-01-15T07:30:00Z',
      status: 'warning'
    }
  ]);

  const [topRegions, setTopRegions] = useState([
    { state: 'SP', professionals: 1250, companies: 450, growth: 12.5 },
    { state: 'RJ', professionals: 890, companies: 320, growth: 8.3 },
    { state: 'MG', professionals: 650, companies: 280, growth: 15.2 },
    { state: 'RS', professionals: 420, companies: 180, growth: 6.7 },
    { state: 'PR', professionals: 380, companies: 160, growth: 9.1 }
  ]);

  const [topProfessionals, setTopProfessionals] = useState([
    {
      id: 1,
      name: 'Maria Santos',
      specialty: 'Engenheira de Segurança',
      contracts: 15,
      rating: 4.9,
      revenue: 18500,
      location: 'São Paulo, SP'
    },
    {
      id: 2,
      name: 'João Silva',
      specialty: 'Técnico em Segurança',
      contracts: 12,
      rating: 4.8,
      revenue: 14200,
      location: 'Rio de Janeiro, RJ'
    },
    {
      id: 3,
      name: 'Ana Costa',
      specialty: 'Médica do Trabalho',
      contracts: 8,
      rating: 5.0,
      revenue: 22000,
      location: 'Belo Horizonte, MG'
    }
  ]);

  const [topCompanies, setTopCompanies] = useState([
    {
      id: 1,
      name: 'TechCorp Ltda',
      segment: 'Tecnologia',
      contracts: 25,
      spent: 45000,
      employees: '101-500',
      location: 'São Paulo, SP'
    },
    {
      id: 2,
      name: 'Indústria Moderna',
      segment: 'Metalúrgica',
      contracts: 18,
      spent: 38500,
      employees: '501-1000',
      location: 'São Bernardo, SP'
    },
    {
      id: 3,
      name: 'Construtech',
      segment: 'Construção Civil',
      contracts: 22,
      spent: 52000,
      employees: '51-100',
      location: 'Rio de Janeiro, RJ'
    }
  ]);

  useEffect(() => {
    // Carregar estatísticas do Firebase
    setStats({
      totalProfissionais: 5247,
      totalEmpresas: 2156,
      contratosAtivos: 1834,
      receitaMensal: 125000,
      crescimentoMensal: 12.5,
      denunciasAbertas: 3,
      usuariosAtivos: 4892,
      transacoes: 2847
    });
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_professional':
        return <Users size={16} className="text-blue-600" />;
      case 'new_company':
        return <Building2 size={16} className="text-green-600" />;
      case 'contract_signed':
        return <FileText size={16} className="text-purple-600" />;
      case 'payment_received':
        return <DollarSign size={16} className="text-yellow-600" />;
      case 'report_issue':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredActivity = recentActivity.filter(activity =>
    activity.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportData = () => {
    alert('Exportando dados...');
  };

  const handleViewDetails = (type: string, id: number) => {
    alert(`Visualizando detalhes: ${type} - ${id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
                Painel Administrativo
              </h1>
              <p className="font-roboto text-gray-600">
                Visão geral da plataforma LiggaSST
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
              <Button icon={Download} onClick={handleExportData}>
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Profissionais</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.totalProfissionais.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">+{stats.crescimentoMensal}% este mês</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Empresas</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.totalEmpresas.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">+8.2% este mês</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Contratos Ativos</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {stats.contratosAtivos.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">+15.3% este mês</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Receita Mensal</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  R$ {stats.receitaMensal.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">+22.1% este mês</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Usuários Ativos
              </h3>
              <Activity size={20} className="text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-blue-600">
                {stats.usuariosAtivos.toLocaleString()}
              </p>
              <p className="font-roboto text-sm text-gray-600">
                Últimas 24h
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Transações
              </h3>
              <BarChart3 size={20} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-green-600">
                {stats.transacoes.toLocaleString()}
              </p>
              <p className="font-roboto text-sm text-gray-600">
                Este mês
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Denúncias
              </h3>
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-red-600">
                {stats.denunciasAbertas}
              </p>
              <p className="font-roboto text-sm text-gray-600">
                Pendentes
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Satisfação
              </h3>
              <Star size={20} className="text-yellow-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-yellow-600">
                4.8
              </p>
              <p className="font-roboto text-sm text-gray-600">
                Avaliação média
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins font-semibold text-xl text-soft-black">
                Atividade Recente
              </h3>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredActivity.map((activity) => (
                <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${getStatusColor(activity.status)}`}>
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-roboto text-sm text-gray-700">
                      {activity.description}
                    </p>
                    <p className="font-roboto text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewDetails(activity.type, activity.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-green-deep"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Top Regions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins font-semibold text-xl text-soft-black">
                Principais Regiões
              </h3>
              <MapPin size={20} className="text-gray-400" />
            </div>
            <div className="space-y-4">
              {topRegions.map((region, index) => (
                <div key={region.state} className="flex items-center justify-between p-3 bg-neutral-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-deep text-white rounded-full flex items-center justify-center font-poppins font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-poppins font-semibold text-soft-black">
                        {region.state}
                      </span>
                      <p className="font-roboto text-xs text-gray-500">
                        +{region.growth}% crescimento
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-roboto text-sm text-gray-700">
                      {region.professionals} profissionais
                    </p>
                    <p className="font-roboto text-xs text-gray-500">
                      {region.companies} empresas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Professionals */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-poppins font-semibold text-xl text-soft-black mb-6">
              Top Profissionais
            </h3>
            <div className="space-y-4">
              {topProfessionals.map((professional, index) => (
                <div key={professional.id} className="flex items-center justify-between p-4 bg-neutral-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-light rounded-full flex items-center justify-center">
                      <span className="font-poppins font-bold text-green-deep text-sm">
                        {professional.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-poppins font-semibold text-soft-black">
                        {professional.name}
                      </h4>
                      <p className="font-roboto text-sm text-gray-600">
                        {professional.specialty}
                      </p>
                      <p className="font-roboto text-xs text-gray-500">
                        {professional.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-roboto text-sm font-semibold text-green-deep">
                      R$ {professional.revenue.toLocaleString()}
                    </p>
                    <p className="font-roboto text-xs text-gray-500">
                      {professional.contracts} contratos
                    </p>
                    <div className="flex items-center justify-end mt-1">
                      <Star size={12} className="text-yellow-400 fill-current mr-1" />
                      <span className="font-roboto text-xs text-gray-600">
                        {professional.rating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-poppins font-semibold text-xl text-soft-black mb-6">
              Top Empresas
            </h3>
            <div className="space-y-4">
              {topCompanies.map((company, index) => (
                <div key={company.id} className="flex items-center justify-between p-4 bg-neutral-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-poppins font-semibold text-soft-black">
                        {company.name}
                      </h4>
                      <p className="font-roboto text-sm text-gray-600">
                        {company.segment}
                      </p>
                      <p className="font-roboto text-xs text-gray-500">
                        {company.location} • {company.employees} funcionários
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-roboto text-sm font-semibold text-blue-600">
                      R$ {company.spent.toLocaleString()}
                    </p>
                    <p className="font-roboto text-xs text-gray-500">
                      {company.contracts} contratos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-poppins font-semibold text-xl text-soft-black mb-6">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Gerenciar usuários')}
            >
              <Users size={24} className="mb-2 text-blue-600" />
              <span className="text-xs">Usuários</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Ver contratos')}
            >
              <FileText size={24} className="mb-2 text-green-600" />
              <span className="text-xs">Contratos</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Denúncias')}
            >
              <AlertTriangle size={24} className="mb-2 text-red-600" />
              <span className="text-xs">Denúncias</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Relatórios')}
            >
              <BarChart3 size={24} className="mb-2 text-purple-600" />
              <span className="text-xs">Relatórios</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Mensagens')}
            >
              <MessageSquare size={24} className="mb-2 text-yellow-600" />
              <span className="text-xs">Mensagens</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => alert('Configurações')}
            >
              <Shield size={24} className="mb-2 text-gray-600" />
              <span className="text-xs">Config</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;