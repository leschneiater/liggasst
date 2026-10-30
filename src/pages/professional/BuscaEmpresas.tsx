import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Building2, MessageSquare, Users, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import { fetchCompanies } from '../../services/database';

interface Company {
  id: string;
  display_name: string;
  city: string | null;
  state: string | null;
  segment: string | null;
  employee_count: string | null;
  description: string | null;
  needs: string[] | null;
}

const estados = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const segmentos = [
  'Indústria Alimentícia',
  'Indústria Automobilística',
  'Indústria Química',
  'Indústria Metalúrgica',
  'Construção Civil',
  'Mineração',
  'Petróleo e Gás',
  'Saúde',
  'Educação',
  'Tecnologia',
  'Comércio',
  'Serviços',
  'Agronegócio',
  'Logística e Transporte',
  'Outro'
];

const BuscaEmpresas: React.FC = () => {
  const navigate = useNavigate();
  const { disponivel: msgDisponivel } = useMessagingDisponivel();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ estado: '', cidade: '', segmento: '' });
  const [appliedFilters, setAppliedFilters] = useState({ estado: '', cidade: '', segmento: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState<string | null>(null);

  // Guarda de corrida: respostas antigas nao sobrescrevem o filtro mais novo.
  const seqBusca = useRef(0);

  const loadCompanies = async (f = appliedFilters) => {
    const minhaSeq = ++seqBusca.current;
    setLoading(true);
    setLoadError(false);
    const r = await fetchCompanies({
      estado: f.estado || undefined,
      cidade: f.cidade || undefined,
      segmento: f.segmento || undefined,
    });
    if (minhaSeq !== seqBusca.current) return;
    if (r.success && Array.isArray(r.data)) {
      setCompanies(r.data as Company[]);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => { loadCompanies(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    setAppliedFilters(filters);
    loadCompanies(filters);
  };

  const clearFilters = () => {
    const vazio = { estado: '', cidade: '', segmento: '' };
    setFilters(vazio);
    setAppliedFilters(vazio);
    loadCompanies(vazio);
  };

  const filtered = companies.filter((c) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      (c.display_name || '').toLowerCase().includes(t) ||
      (c.segment || '').toLowerCase().includes(t) ||
      (c.city || '').toLowerCase().includes(t) ||
      (c.state || '').toLowerCase().includes(t) ||
      (c.description || '').toLowerCase().includes(t) ||
      (c.needs || []).some((n) => n.toLowerCase().includes(t))
    );
  });

  const enviarMensagem = (c: Company) => {
    navigate(`/mensagens-profissional?para=${c.id}`, {
      state: { nome: c.display_name || 'Empresa' }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Buscar Empresas
          </h1>
          <p className="font-roboto text-gray-600">
            Encontre empresas que precisam dos seus serviços de SST
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, segmento, cidade ou necessidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep transition-all duration-300"
                />
              </div>
            </div>
            <Button
              variant="outline"
              icon={SlidersHorizontal}
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              Filtros {Object.values(appliedFilters).some(v => v) && '(Ativos)'}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Todos os estados</option>
                    {estados.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={filters.cidade}
                    onChange={(e) => setFilters(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  />
                </div>

                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Segmento
                  </label>
                  <select
                    value={filters.segmento}
                    onChange={(e) => setFilters(prev => ({ ...prev, segmento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Todos os segmentos</option>
                    {segmentos.map(segmento => (
                      <option key={segmento} value={segmento}>{segmento}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="font-roboto text-gray-600">
            {!loading && !loadError && `${filtered.length} empresa(s) encontrada(s)`}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Carregando empresas...</p>
          </div>
        )}

        {/* Error */}
        {loadError && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={28} className="text-red-600" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-2">
              Não foi possível carregar as empresas
            </h2>
            <p className="font-roboto text-gray-600 mb-6">
              Tente novamente em alguns instantes.
            </p>
            <Button onClick={() => loadCompanies()}>Tentar novamente</Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-green-deep" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-2">
              Nenhuma empresa encontrada
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto">
              {companies.length === 0
                ? 'Ainda não há empresas cadastradas com esses filtros. Tente ampliar a busca.'
                : 'Nenhum resultado para o termo buscado. Tente outras palavras.'}
            </p>
          </div>
        )}

        {/* Companies Grid */}
        {!loading && !loadError && filtered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-14 h-14 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-poppins font-bold text-xl text-green-deep">
                      {(company.display_name || 'E').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-poppins font-semibold text-lg text-soft-black break-words">
                      {company.display_name}
                    </h3>
                    {company.segment && (
                      <p className="font-roboto text-sm text-green-deep font-medium">
                        {company.segment}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                      {(company.city || company.state) && (
                        <span className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {[company.city, company.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {company.employee_count && (
                        <span className="flex items-center">
                          <Users size={14} className="mr-1" />
                          {company.employee_count} funcionários
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {company.description && (
                  <p className="font-roboto text-sm text-gray-600 mb-4 line-clamp-3">
                    {company.description}
                  </p>
                )}

                {company.needs && company.needs.length > 0 && (
                  <div className="mb-4">
                    <p className="font-roboto font-medium text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Necessidades
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(expandedNeeds === company.id ? company.needs : company.needs.slice(0, 4)).map((need) => (
                        <span
                          key={need}
                          className="bg-green-light text-green-deep text-xs font-roboto px-2 py-1 rounded-full"
                        >
                          {need}
                        </span>
                      ))}
                      {company.needs.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setExpandedNeeds(expandedNeeds === company.id ? null : company.id)}
                          className="text-xs text-green-deep font-roboto font-semibold px-2 py-1 underline hover:text-green-800"
                        >
                          {expandedNeeds === company.id ? 'Mostrar menos' : `+${company.needs.length - 4} mais`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {msgDisponivel && (
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <Button
                      onClick={() => enviarMensagem(company)}
                      icon={MessageSquare}
                      className="w-full"
                      size="sm"
                    >
                      Enviar Mensagem
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuscaEmpresas;
