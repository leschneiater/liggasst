import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Building2,
  AlertTriangle,
  MapPin,
  Activity,
  BarChart3,
  Download,
  Search,
  Eye,
  GraduationCap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  fetchReports,
  fetchProfileNames,
  fetchAdminOverview,
  fetchAdminMembers,
  fetchAdminDemands,
  fetchTrainingsAdmin,
  AdminOverview,
  AdminMemberRow,
  AdminDemandRow,
  ReportRow,
} from '../../services/database';
import { montarCsvAdmin, periodoDesde } from './exportarAdmin';
import {
  montarFeedAtividade,
  principaisRegioes,
  filtrarDemandasVisiveis,
  demandasNoPeriodo,
  TipoAtividade,
} from './adminDados';

// Painel administrativo: TODOS os numeros e listas vem do banco. O que nao
// tem fonte real no produto (receita, transacoes, avaliacoes, usuarios
// ativos em 24h, contratos) foi removido em vez de exibir valor ilustrativo
// ou destacar area que ainda nao tem fluxo operacional.

interface DadosAdmin {
  visao: AdminOverview;
  membros: AdminMemberRow[];
  demandas: AdminDemandRow[];
  denuncias: ReportRow[];
  treinamentosPublicados: number;
}

const DashboardAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [exportando, setExportando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [dados, setDados] = useState<DadosAdmin | null>(null);
  const [timeFilter, setTimeFilter] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const desde = periodoDesde(timeFilter);
    const [visao, membros, demandas, denuncias, treinamentos] = await Promise.all([
      fetchAdminOverview(desde.toISOString()),
      fetchAdminMembers(),
      fetchAdminDemands(),
      fetchReports(),
      fetchTrainingsAdmin(),
    ]);
    // qualquer leitura que falha derruba o painel inteiro para erro: numero
    // parcial nunca aparece como se fosse zero real
    if (!visao.success || !visao.data || !membros.success || !demandas.success || !denuncias.success || !treinamentos.success) {
      toast.error('Não foi possível carregar o painel. Tente novamente.');
      setErro(true);
      setCarregando(false);
      return;
    }
    setErro(false);
    setDados({
      visao: visao.data,
      membros: membros.data,
      demandas: demandas.data,
      denuncias: denuncias.data,
      // conteudo de teste nunca entra nos numeros do painel
      treinamentosPublicados: treinamentos.data.filter(t => t.status === 'published' && !t.is_test).length,
    });
    setCarregando(false);
  }, [timeFilter]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const getActivityIcon = (tipo: TipoAtividade) => {
    switch (tipo) {
      case 'cadastro_profissional':
        return <Users size={16} className="text-blue-600" />;
      case 'cadastro_empresa':
        return <Building2 size={16} className="text-green-600" />;
      case 'demanda':
        return <BarChart3 size={16} className="text-yellow-600" />;
      case 'denuncia':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getActivityColor = (tipo: TipoAtividade) =>
    tipo === 'denuncia' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';

  const handleExportData = async () => {
    setExportando(true);
    try {
      const desde = periodoDesde(timeFilter);
      const [visao, membros, demandas, denuncias] = await Promise.all([
        fetchAdminOverview(desde.toISOString()),
        fetchAdminMembers(),
        fetchAdminDemands(),
        fetchReports(),
      ]);
      if (!visao.success || !visao.data || !membros.success || !demandas.success || !denuncias.success) {
        toast.error('Não foi possível gerar a exportação. Tente novamente.');
        return;
      }
      const ids = [...new Set([
        ...denuncias.data.flatMap(d => [d.reporter_id, d.reported_id]),
        ...demandas.data.map(d => d.company_id),
      ])];
      const nomes = await fetchProfileNames(ids);
      const csv = montarCsvAdmin({
        visao: visao.data,
        membros: membros.data,
        // mesma elegibilidade da tela: demanda de empresa de teste/removida
        // nao entra no relatorio
        demandas: filtrarDemandasVisiveis(demandas.data, membros.data),
        denuncias: denuncias.data,
        nomes: nomes.success ? nomes.data : {},
        desde,
        timeFilter,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liggasst-relatorio-${timeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Relatório completo gerado com dados reais.');
    } finally {
      setExportando(false);
    }
  };

  if (carregando || !dados) {
    return (
      <div className="min-h-screen bg-neutral-gray">
        <AdminAreaNav />
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {erro ? (
            <div>
              <p className="font-roboto text-gray-600 mb-4">
                Não foi possível carregar os dados do painel.
              </p>
              <Button onClick={carregar}>Tentar novamente</Button>
            </div>
          ) : (
            <p className="font-roboto text-gray-600">Carregando dados do painel…</p>
          )}
        </div>
      </div>
    );
  }

  const desde = periodoDesde(timeFilter);
  const demandasVisiveis = filtrarDemandasVisiveis(dados.demandas, dados.membros);
  const feed = montarFeedAtividade(dados.membros, dados.demandas, dados.denuncias);
  const feedFiltrado = feed.filter(a => a.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
  const regioes = principaisRegioes(dados.membros);
  const novosCadastros = dados.visao.novosProfissionaisPeriodo + dados.visao.novasEmpresasPeriodo;

  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="py-8">
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
              <Button icon={Download} onClick={handleExportData} disabled={exportando}>
                {exportando ? 'Exportando...' : 'Exportar'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Stats — todos reais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Profissionais</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {dados.visao.totalProfissionais.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">
                  +{dados.visao.novosProfissionaisPeriodo} no período
                </p>
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
                  {dados.visao.totalEmpresas.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">
                  +{dados.visao.novasEmpresasPeriodo} no período
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Demandas</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {demandasVisiveis.length.toLocaleString()}
                </p>
                <p className="font-roboto text-xs text-green-600">
                  +{demandasNoPeriodo(demandasVisiveis, desde)} no período
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BarChart3 size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-roboto text-sm text-gray-600">Denúncias Pendentes</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {dados.visao.denunciasAbertas}
                </p>
                <p className="font-roboto text-xs text-green-600">
                  {dados.visao.denunciasPeriodo} no período
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats — todos reais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Novos Cadastros
              </h3>
              <Activity size={20} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-green-600">
                {novosCadastros.toLocaleString()}
              </p>
              <p className="font-roboto text-sm text-gray-600">
                profissionais e empresas no período selecionado
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Treinamentos
              </h3>
              <GraduationCap size={20} className="text-purple-600" />
            </div>
            <div className="text-center">
              <p className="font-poppins font-bold text-3xl text-purple-600">
                {dados.treinamentosPublicados.toLocaleString()}
              </p>
              <p className="font-roboto text-sm text-gray-600">
                publicados
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Atividade Recente — eventos reais */}
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
              {feedFiltrado.length === 0 && (
                <p className="font-roboto text-sm text-gray-500">
                  Nenhuma atividade registrada ainda.
                </p>
              )}
              {feedFiltrado.map((activity) => (
                <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.tipo)}`}>
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-roboto text-sm text-gray-700">
                      {activity.descricao}
                    </p>
                    <p className="font-roboto text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {activity.tipo === 'denuncia' && (
                    <button
                      onClick={() => navigate('/admin/denuncias')}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-green-deep"
                      aria-label="Ver denúncias"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Principais Regiões — contagem real de membros por UF */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins font-semibold text-xl text-soft-black">
                Principais Regiões
              </h3>
              <MapPin size={20} className="text-gray-400" />
            </div>
            <div className="space-y-4">
              {regioes.length === 0 && (
                <p className="font-roboto text-sm text-gray-500">
                  Nenhum membro com estado informado ainda.
                </p>
              )}
              {regioes.map((region, index) => (
                <div key={region.state} className="flex items-center justify-between p-3 bg-neutral-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-deep text-white rounded-full flex items-center justify-center font-poppins font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-poppins font-semibold text-soft-black">
                      {region.state}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-roboto text-sm text-gray-700">
                      {region.profissionais} profissionais
                    </p>
                    <p className="font-roboto text-xs text-gray-500">
                      {region.empresas} empresas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ações Rápidas — somente destinos que existem */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-poppins font-semibold text-xl text-soft-black mb-6">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => navigate('/admin/denuncias')}
            >
              <AlertTriangle size={24} className="mb-2 text-red-600" />
              <span className="text-xs">Denúncias</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => navigate('/admin/treinamentos')}
            >
              <GraduationCap size={24} className="mb-2 text-purple-600" />
              <span className="text-xs">Treinamentos</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={handleExportData}
              disabled={exportando}
            >
              <Download size={24} className="mb-2 text-green-600" />
              <span className="text-xs">Exportar CSV</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DashboardAdmin;
