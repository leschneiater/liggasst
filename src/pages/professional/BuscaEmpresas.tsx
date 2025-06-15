import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Users, 
  Star,
  Eye,
  MessageSquare,
  Briefcase
} from 'lucide-react';
import Button from '../../components/ui/Button';

interface Company {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  estado: string;
  numeroFuncionarios: string;
  avaliacao: number;
  totalAvaliacoes: number;
  descricao: string;
  necessidades: string[];
  logo?: string;
}

const BuscaEmpresas: React.FC = () => {
  const [companies] = useState<Company[]>([
    {
      id: '1',
      nome: 'TechCorp Ltda',
      segmento: 'Tecnologia',
      cidade: 'São Paulo',
      estado: 'SP',
      numeroFuncionarios: '101-500',
      avaliacao: 4.8,
      totalAvaliacoes: 24,
      descricao: 'Empresa de tecnologia focada em soluções inovadoras para o mercado corporativo.',
      necessidades: ['PCMSO', 'PPRA', 'Treinamentos NR']
    },
    {
      id: '2',
      nome: 'Indústria Moderna',
      segmento: 'Indústria Metalúrgica',
      cidade: 'São Bernardo do Campo',
      estado: 'SP',
      numeroFuncionarios: '501-1000',
      avaliacao: 4.6,
      totalAvaliacoes: 18,
      descricao: 'Indústria metalúrgica com foco em peças automotivas e soluções industriais.',
      necessidades: ['LTCAT', 'Perícia Técnica', 'Consultoria SST']
    },
    {
      id: '3',
      nome: 'Construtech',
      segmento: 'Construção Civil',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      numeroFuncionarios: '51-100',
      avaliacao: 4.9,
      totalAvaliacoes: 31,
      descricao: 'Construtora especializada em obras residenciais e comerciais de alto padrão.',
      necessidades: ['PCMAT', 'Treinamentos NR-35', 'Auditoria de Segurança']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    segmento: '',
    tamanho: '',
    necessidade: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const estados = [
    'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'PE', 'CE'
  ];

  const segmentos = [
    'Tecnologia',
    'Indústria Metalúrgica',
    'Construção Civil',
    'Indústria Química',
    'Saúde',
    'Educação',
    'Comércio',
    'Serviços'
  ];

  const tamanhos = [
    '1-10',
    '11-50',
    '51-100',
    '101-500',
    '501-1000',
    'Mais de 1000'
  ];

  const necessidades = [
    'PCMSO',
    'PPRA',
    'LTCAT',
    'PPP',
    'PCMAT',
    'Treinamentos NR',
    'Consultoria SST',
    'Auditoria de Segurança',
    'Perícia Técnica'
  ];

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.segmento.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.cidade.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = !filters.estado || company.estado === filters.estado;
    const matchesSegmento = !filters.segmento || company.segmento === filters.segmento;
    const matchesTamanho = !filters.tamanho || company.numeroFuncionarios === filters.tamanho;
    const matchesNecessidade = !filters.necessidade || 
                              company.necessidades.some(n => n.includes(filters.necessidade));

    return matchesSearch && matchesEstado && matchesSegmento && matchesTamanho && matchesNecessidade;
  });

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      estado: '',
      segmento: '',
      tamanho: '',
      necessidade: ''
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por empresa, segmento ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Todos os estados</option>
                    {estados.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Segmento
                  </label>
                  <select
                    value={filters.segmento}
                    onChange={(e) => handleFilterChange('segmento', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Todos os segmentos</option>
                    {segmentos.map(segmento => (
                      <option key={segmento} value={segmento}>{segmento}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Tamanho
                  </label>
                  <select
                    value={filters.tamanho}
                    onChange={(e) => handleFilterChange('tamanho', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Qualquer tamanho</option>
                    {tamanhos.map(tamanho => (
                      <option key={tamanho} value={tamanho}>{tamanho} funcionários</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                    Necessidade
                  </label>
                  <select
                    value={filters.necessidade}
                    onChange={(e) => handleFilterChange('necessidade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  >
                    <option value="">Todas as necessidades</option>
                    {necessidades.map(necessidade => (
                      <option key={necessidade} value={necessidade}>{necessidade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="font-roboto text-gray-600">
            {filteredCompanies.length} empresa(s) encontrada(s)
          </p>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-green-deep" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-poppins font-semibold text-lg text-soft-black mb-1">
                      {company.nome}
                    </h3>
                    <p className="font-roboto text-sm text-gray-600 mb-2">
                      {company.segmento}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        <span>{company.cidade}, {company.estado}</span>
                      </div>
                      <div className="flex items-center">
                        <Users size={14} className="mr-1" />
                        <span>{company.numeroFuncionarios}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Star size={16} className="text-yellow-400 fill-current" />
                  <span className="font-roboto text-sm text-gray-700">
                    {company.avaliacao}
                  </span>
                  <span className="font-roboto text-xs text-gray-500">
                    ({company.totalAvaliacoes})
                  </span>
                </div>
              </div>

              <p className="font-roboto text-gray-700 text-sm mb-4">
                {company.descricao}
              </p>

              <div className="mb-4">
                <p className="font-roboto font-medium text-sm text-gray-700 mb-2">
                  Necessidades:
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.necessidades.map((necessidade, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-light bg-opacity-20 text-green-deep text-xs rounded-full font-roboto"
                    >
                      {necessidade}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" size="sm" icon={Eye} className="flex-1">
                  Ver Perfil
                </Button>
                <Button size="sm" icon={MessageSquare} className="flex-1">
                  Entrar em Contato
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="font-poppins font-medium text-gray-900 mb-2">
              Nenhuma empresa encontrada
            </h3>
            <p className="font-roboto text-gray-600">
              Tente ajustar os filtros de busca ou o termo pesquisado
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuscaEmpresas;