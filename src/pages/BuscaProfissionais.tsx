import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Eye,
  User,
  Calendar,
  DollarSign,
  Plus,
  SlidersHorizontal,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { searchProfessionals } from '../services/database';
import Button from '../components/ui/Button';
import CadastroEmpresaModal from '../components/CadastroEmpresaModal';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  nome: string;
  formacao: string;
  cidade: string;
  estado: string;
  experiencia: number | null;
  valorHora: number | null;
  raioAtendimento: number | null;
  especializacoes: string[];
  disponibilidade: string[];
  descricao: string;
}

const iniciaisNome = (nome: string): string => {
  const partes = nome.trim().split(/\s+/).filter(p => /[A-Za-zÀ-ÿ]/.test(p[0] ?? ''));
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
};

const BuscaProfissionais: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    formacao: '',
    experiencia: '',
    especializacao: '',
    disponibilidade: '',
    valorMin: '',
    valorMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'experiencia' | 'valor' | ''>('');
  const [isCadastroEmpresaOpen, setIsCadastroEmpresaOpen] = useState(false);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Verificar se o usuário está logado
  useEffect(() => {
    if (!currentUser) {
      toast.error('Você precisa estar logado para buscar profissionais');
      navigate('/');
    }
  }, [currentUser, navigate]);

  const loadProfessionals = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await searchProfessionals({
        state: filters.estado || undefined,
        specialization: filters.especializacao || undefined
      });
      setProfessionals(rows);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (!currentUserId) return;
    loadProfessionals();
  }, [currentUserId, filters.estado, filters.especializacao]);

  const estados = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
  ];

  const formacoes = [
    'Técnico em Segurança do Trabalho',
    'Engenheiro de Segurança do Trabalho',
    'Técnico em Enfermagem do Trabalho',
    'Enfermeiro do Trabalho',
    'Médico do Trabalho'
  ];

  const experiencias = [
    '1-3 anos',
    '4-7 anos',
    '8-12 anos',
    'Mais de 12 anos'
  ];

  const especializacoes = [
    'PCMSO',
    'PGR',
    'LTCAT',
    'PPP',
    'NR-35',
    'NR-33',
    'Treinamentos NR',
    'Consultoria SST',
    'Auditoria',
    'Perícia Técnica'
  ];

  const disponibilidades = [
    'Manhã',
    'Tarde',
    'Noite',
    'Finais de semana'
  ];

  const filteredProfessionals = professionals.filter(professional => {
    const matchesSearch = professional.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.formacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.estado.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = !filters.estado || professional.estado === filters.estado;
    const matchesFormacao = !filters.formacao || professional.formacao === filters.formacao;
    
    const matchesEspecializacao = !filters.especializacao || 
                                 professional.especializacoes.includes(filters.especializacao);
    
    const matchesDisponibilidade = !filters.disponibilidade || 
                                  professional.disponibilidade.includes(filters.disponibilidade);

    let matchesExperiencia = true;
    if (filters.experiencia) {
      switch (filters.experiencia) {
        case '1-3 anos':
          matchesExperiencia = professional.experiencia !== null && professional.experiencia >= 1 && professional.experiencia <= 3;
          break;
        case '4-7 anos':
          matchesExperiencia = professional.experiencia !== null && professional.experiencia >= 4 && professional.experiencia <= 7;
          break;
        case '8-12 anos':
          matchesExperiencia = professional.experiencia !== null && professional.experiencia >= 8 && professional.experiencia <= 12;
          break;
        case 'Mais de 12 anos':
          matchesExperiencia = professional.experiencia !== null && professional.experiencia > 12;
          break;
      }
    }

    let matchesValor = true;
    if (filters.valorMin && professional.valorHora != null) {
      matchesValor = professional.valorHora >= parseInt(filters.valorMin);
    }
    if (filters.valorMax && professional.valorHora != null) {
      matchesValor = matchesValor && professional.valorHora <= parseInt(filters.valorMax);
    }

    return matchesSearch && matchesEstado && matchesFormacao && matchesExperiencia && 
           matchesEspecializacao && matchesDisponibilidade && matchesValor;
  });

  const sortedProfessionals = [...filteredProfessionals].sort((a, b) => {
    if (sortBy === 'experiencia') return (b.experiencia ?? -1) - (a.experiencia ?? -1);
    if (sortBy === 'valor') return (a.valorHora ?? Infinity) - (b.valorHora ?? Infinity);
    return 0;
  });

  const handleFilterChange = (filterType: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      estado: '',
      formacao: '',
      experiencia: '',
      especializacao: '',
      disponibilidade: '',
      valorMin: '',
      valorMax: ''
    });
  };

  const handleViewProfile = (professionalId: string) => {
    navigate(`/perfil-profissional-publico/${professionalId}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-gray py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={32} className="text-yellow-600" />
            </div>
            
            <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
              Acesso Restrito
            </h2>
            
            <p className="font-roboto text-gray-600 mb-6">
              Você precisa estar logado para buscar profissionais.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="flex-1"
              >
                Voltar ao Início
              </Button>
              <Button 
                onClick={() => navigate('/auth/login')}
                className="flex-1"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-gray py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Encontre Profissionais de SST
            </h1>
            <p className="font-roboto text-lg md:text-xl text-gray-600">
              Conecte-se com especialistas qualificados em Segurança do Trabalho
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, formação, cidade ou estado (ex: SP, RJ, MG)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep transition-all duration-300"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                icon={SlidersHorizontal}
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap"
              >
                Filtros {Object.values(filters).some(v => v) && '(Ativos)'}
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
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
                        <option key={estado.sigla} value={estado.sigla}>
                          {estado.sigla} - {estado.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Formação
                    </label>
                    <select
                      value={filters.formacao}
                      onChange={(e) => handleFilterChange('formacao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    >
                      <option value="">Todas as formações</option>
                      {formacoes.map(formacao => (
                        <option key={formacao} value={formacao}>{formacao}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Experiência
                    </label>
                    <select
                      value={filters.experiencia}
                      onChange={(e) => handleFilterChange('experiencia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    >
                      <option value="">Qualquer experiência</option>
                      {experiencias.map(experiencia => (
                        <option key={experiencia} value={experiencia}>{experiencia}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Especialização
                    </label>
                    <select
                      value={filters.especializacao}
                      onChange={(e) => handleFilterChange('especializacao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    >
                      <option value="">Todas as especializações</option>
                      {especializacoes.map(especializacao => (
                        <option key={especializacao} value={especializacao}>{especializacao}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Disponibilidade
                    </label>
                    <select
                      value={filters.disponibilidade}
                      onChange={(e) => handleFilterChange('disponibilidade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    >
                      <option value="">Qualquer horário</option>
                      {disponibilidades.map(disponibilidade => (
                        <option key={disponibilidade} value={disponibilidade}>{disponibilidade}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Valor Mín. (R$/h)
                    </label>
                    <input
                      type="number"
                      value={filters.valorMin}
                      onChange={(e) => handleFilterChange('valorMin', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    />
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                      Valor Máx. (R$/h)
                    </label>
                    <input
                      type="number"
                      value={filters.valorMax}
                      onChange={(e) => handleFilterChange('valorMax', e.target.value)}
                      placeholder="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    />
                  </div>

                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="mb-6 flex items-center justify-between">
            <p className="font-roboto text-gray-600">
              {!loading && !loadError && `${sortedProfessionals.length} profissional(is) encontrado(s)`}
            </p>
            <div className="flex items-center space-x-2">
              <span className="font-roboto text-sm text-gray-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'experiencia' | 'valor' | '')}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-deep"
              >
                <option value="">Padrão</option>
                <option value="experiencia">Experiência</option>
                <option value="valor">Valor</option>
              </select>
            </div>
          </div>

          {/* Professionals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedProfessionals.map((professional) => (
              <div key={professional.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-medium transition-colors duration-300">
                      <span className="font-poppins font-bold text-sm text-green-deep group-hover:text-white">
                        {iniciaisNome(professional.nome)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-poppins font-semibold text-lg text-soft-black truncate">
                          {professional.nome}
                        </h3>
                      </div>
                      <p className="font-roboto text-sm text-gray-600 mb-2">
                        {professional.formacao}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                        {(professional.cidade || professional.estado) && (
                          <div className="flex items-center">
                            <MapPin size={12} className="mr-1" />
                            <span>{[professional.cidade, professional.estado].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {professional.experiencia !== null && (
                          <div className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            <span>{professional.experiencia} anos</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 max-w-[40%]">
                    {professional.valorHora && (
                      <div className="flex items-center text-green-deep">
                        <DollarSign size={12} className="mr-1" />
                        <span className="font-roboto text-sm font-medium">
                          R$ {professional.valorHora}/h
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="font-roboto text-gray-700 text-sm mb-4 line-clamp-2">
                  {professional.descricao}
                </p>

                {professional.especializacoes.length > 0 && (
                <div className="mb-4">
                  <p className="font-roboto font-medium text-sm text-gray-700 mb-2">
                    Especializações:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {professional.especializacoes.slice(0, 3).map((especializacao, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-light bg-opacity-20 text-green-deep text-xs rounded-full font-roboto"
                      >
                        {especializacao}
                      </span>
                    ))}
                    {professional.especializacoes.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-roboto">
                        +{professional.especializacoes.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                )}
                {professional.disponibilidade.length > 0 && (
                <div className="mb-4">
                  <p className="font-roboto font-medium text-sm text-gray-700 mb-2">
                    Disponibilidade:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {professional.disponibilidade.map((horario, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-roboto"
                      >
                        {horario}
                      </span>
                    ))}
                  </div>
                </div>

                )}
                {professional.raioAtendimento !== null && (
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Atende até {professional.raioAtendimento}km</span>
                  </div>
                )}

                <p className="font-roboto text-xs text-gray-500 mb-3">
                  Para conversar, abra o perfil e envie uma mensagem pela plataforma.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={Eye} 
                    className="flex-1 text-xs"
                    onClick={() => handleViewProfile(professional.id)}
                  >
                    Ver Perfil
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center mb-6">
              <p className="font-roboto text-gray-600">Carregando profissionais...</p>
            </div>
          )}

          {loadError && !loading && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center mb-6">
              <h3 className="font-poppins font-medium text-gray-900 mb-2">
                Não foi possível carregar os profissionais
              </h3>
              <p className="font-roboto text-gray-600 mb-4">
                Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={loadProfessionals}>Tentar novamente</Button>
            </div>
          )}

          {!loading && !loadError && sortedProfessionals.length === 0 && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
              <User size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="font-poppins font-medium text-gray-900 mb-2">
                Nenhum profissional encontrado
              </h3>
              <p className="font-roboto text-gray-600">
                Tente ajustar os filtros de busca ou o termo pesquisado
              </p>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-12 bg-gradient-to-r from-green-deep to-green-medium text-white p-8 rounded-xl text-center">
            <h2 className="font-poppins font-bold text-2xl md:text-3xl mb-4">
              Não encontrou o profissional ideal?
            </h2>
            <p className="font-roboto text-green-light mb-6 text-lg">
              Publique sua demanda e acompanhe o status no painel da empresa
            </p>
            <Button 
              onClick={() => navigate('/publique-demanda')}
              size="lg"
              className="bg-green-light text-green-deep hover:bg-white font-semibold"
              icon={Plus}
            >
              Publicar Demanda
            </Button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <CadastroEmpresaModal 
        isOpen={isCadastroEmpresaOpen} 
        onClose={() => setIsCadastroEmpresaOpen(false)} 
      />
    </>
  );
};

export default BuscaProfissionais;
