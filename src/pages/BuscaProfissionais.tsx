import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  Award, 
  Star,
  Eye,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  Plus,
  SlidersHorizontal,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import CadastroEmpresaModal from '../components/CadastroEmpresaModal';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  nome: string;
  formacao: string;
  cidade: string;
  estado: string;
  experiencia: number;
  avaliacao: number;
  totalAvaliacoes: number;
  valorHora?: number;
  raioAtendimento: number;
  especializacoes: string[];
  disponibilidade: string[];
  descricao: string;
  verificado: boolean;
  foto?: string;
}

const BuscaProfissionais: React.FC = () => {
  const [professionals] = useState<Professional[]>([
    {
      id: '1',
      nome: 'João Silva',
      formacao: 'Técnico em Segurança do Trabalho',
      cidade: 'São Paulo',
      estado: 'SP',
      experiencia: 8,
      avaliacao: 4.9,
      totalAvaliacoes: 47,
      valorHora: 85,
      raioAtendimento: 50,
      especializacoes: ['PCMSO', 'PGR', 'NR-35'],
      disponibilidade: ['Manhã', 'Tarde'],
      descricao: 'Profissional experiente com foco em indústrias e construção civil.',
      verificado: true
    },
    {
      id: '2',
      nome: 'Maria Santos',
      formacao: 'Engenheira de Segurança do Trabalho',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      experiencia: 12,
      avaliacao: 4.8,
      totalAvaliacoes: 63,
      valorHora: 120,
      raioAtendimento: 30,
      especializacoes: ['LTCAT', 'Perícia Técnica', 'Consultoria SST'],
      disponibilidade: ['Manhã', 'Tarde', 'Noite'],
      descricao: 'Especialista em laudos técnicos e consultoria para grandes empresas.',
      verificado: true
    },
    {
      id: '3',
      nome: 'Carlos Oliveira',
      formacao: 'Técnico em Segurança do Trabalho',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      experiencia: 5,
      avaliacao: 4.7,
      totalAvaliacoes: 28,
      valorHora: 70,
      raioAtendimento: 40,
      especializacoes: ['Treinamentos NR', 'CIPA', 'Auditoria'],
      disponibilidade: ['Tarde', 'Noite'],
      descricao: 'Focado em treinamentos e desenvolvimento de equipes de segurança.',
      verificado: false
    },
    {
      id: '4',
      nome: 'Ana Costa',
      formacao: 'Médica do Trabalho',
      cidade: 'Porto Alegre',
      estado: 'RS',
      experiencia: 15,
      avaliacao: 5.0,
      totalAvaliacoes: 89,
      valorHora: 200,
      raioAtendimento: 25,
      especializacoes: ['PCMSO', 'Medicina Ocupacional', 'Perícias'],
      disponibilidade: ['Manhã', 'Tarde'],
      descricao: 'Médica especializada em saúde ocupacional com vasta experiência.',
      verificado: true
    },
    {
      id: '5',
      nome: 'Roberto Lima',
      formacao: 'Engenheiro de Segurança do Trabalho',
      cidade: 'Salvador',
      estado: 'BA',
      experiencia: 10,
      avaliacao: 4.6,
      totalAvaliacoes: 34,
      valorHora: 95,
      raioAtendimento: 60,
      especializacoes: ['PGR', 'LTCAT', 'NR-33'],
      disponibilidade: ['Manhã', 'Tarde', 'Finais de semana'],
      descricao: 'Especialista em espaços confinados e ambientes industriais.',
      verificado: true
    },
    {
      id: '6',
      nome: 'Fernanda Rocha',
      formacao: 'Técnica em Enfermagem do Trabalho',
      cidade: 'Fortaleza',
      estado: 'CE',
      experiencia: 6,
      avaliacao: 4.8,
      totalAvaliacoes: 22,
      valorHora: 60,
      raioAtendimento: 35,
      especializacoes: ['PCMSO', 'Primeiros Socorros', 'Ergonomia'],
      disponibilidade: ['Manhã', 'Tarde'],
      descricao: 'Enfermeira especializada em saúde ocupacional e ergonomia.',
      verificado: true
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    formacao: '',
    experiencia: '',
    especializacao: '',
    disponibilidade: '',
    verificado: false,
    valorMin: '',
    valorMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);
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
    const matchesVerificado = !filters.verificado || professional.verificado;
    
    const matchesEspecializacao = !filters.especializacao || 
                                 professional.especializacoes.includes(filters.especializacao);
    
    const matchesDisponibilidade = !filters.disponibilidade || 
                                  professional.disponibilidade.includes(filters.disponibilidade);

    let matchesExperiencia = true;
    if (filters.experiencia) {
      switch (filters.experiencia) {
        case '1-3 anos':
          matchesExperiencia = professional.experiencia >= 1 && professional.experiencia <= 3;
          break;
        case '4-7 anos':
          matchesExperiencia = professional.experiencia >= 4 && professional.experiencia <= 7;
          break;
        case '8-12 anos':
          matchesExperiencia = professional.experiencia >= 8 && professional.experiencia <= 12;
          break;
        case 'Mais de 12 anos':
          matchesExperiencia = professional.experiencia > 12;
          break;
      }
    }

    let matchesValor = true;
    if (filters.valorMin && professional.valorHora) {
      matchesValor = professional.valorHora >= parseInt(filters.valorMin);
    }
    if (filters.valorMax && professional.valorHora) {
      matchesValor = matchesValor && professional.valorHora <= parseInt(filters.valorMax);
    }

    return matchesSearch && matchesEstado && matchesFormacao && matchesExperiencia && 
           matchesEspecializacao && matchesDisponibilidade && matchesVerificado && matchesValor;
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
      verificado: false,
      valorMin: '',
      valorMax: ''
    });
  };

  const handleContactProfessional = (professionalId: string) => {
    // Simular contato com profissional
    toast.success(`Entrando em contato com o profissional ${professionalId}`);
  };

  const handleViewProfile = (professionalId: string) => {
    // Redirecionar para perfil do profissional
    window.location.href = `/perfil-profissional-publico/${professionalId}`;
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

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.verificado}
                        onChange={(e) => handleFilterChange('verificado', e.target.checked)}
                        className="rounded border-gray-300 text-green-deep focus:ring-green-deep mr-2"
                      />
                      <span className="font-roboto text-sm text-gray-700">Apenas verificados</span>
                    </label>
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
              {filteredProfessionals.length} profissional(is) encontrado(s)
            </p>
            <div className="flex items-center space-x-2">
              <span className="font-roboto text-sm text-gray-500">Ordenar por:</span>
              <select className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-deep">
                <option>Relevância</option>
                <option>Avaliação</option>
                <option>Experiência</option>
                <option>Valor</option>
              </select>
            </div>
          </div>

          {/* Professionals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProfessionals.map((professional) => (
              <div key={professional.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-medium transition-colors duration-300">
                      <span className="font-poppins font-bold text-sm text-green-deep group-hover:text-white">
                        {professional.nome.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-poppins font-semibold text-lg text-soft-black truncate">
                          {professional.nome}
                        </h3>
                        {professional.verificado && (
                          <div className="w-5 h-5 bg-green-medium rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="font-roboto text-sm text-gray-600 mb-2">
                        {professional.formacao}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                        <div className="flex items-center">
                          <MapPin size={12} className="mr-1" />
                          <span>{professional.cidade}, {professional.estado}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          <span>{professional.experiencia} anos</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center space-x-1 mb-1">
                      <Star size={14} className="text-yellow-400 fill-current" />
                      <span className="font-roboto text-sm text-gray-700">
                        {professional.avaliacao}
                      </span>
                      <span className="font-roboto text-xs text-gray-500">
                        ({professional.totalAvaliacoes})
                      </span>
                    </div>
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

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Atende até {professional.raioAtendimento}km</span>
                </div>

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
                  <Button 
                    size="sm" 
                    icon={MessageSquare} 
                    className="flex-1 text-xs"
                    onClick={() => handleContactProfessional(professional.id)}
                  >
                    Contatar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredProfessionals.length === 0 && (
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
              Publique sua demanda e receba propostas de profissionais qualificados
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
