import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import Button from '../../components/ui/Button';

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
      especializacoes: ['PCMSO', 'PPRA', 'NR-35'],
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
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    formacao: '',
    experiencia: '',
    especializacao: '',
    disponibilidade: '',
    verificado: false
  });
  const [showFilters, setShowFilters] = useState(false);

  const estados = [
    'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'PE', 'CE'
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
    'PPRA',
    'LTCAT',
    'PPP',
    'NR-35',
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
                         professional.cidade.toLowerCase().includes(searchTerm.toLowerCase());
    
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

    return matchesSearch && matchesEstado && matchesFormacao && matchesExperiencia && 
           matchesEspecializacao && matchesDisponibilidade && matchesVerificado;
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
      verificado: false
    });
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Buscar Profissionais
          </h1>
          <p className="font-roboto text-gray-600">
            Encontre profissionais qualificados de SST para sua empresa
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
                  placeholder="Buscar por nome, formação ou cidade..."
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
        <div className="mb-6">
          <p className="font-roboto text-gray-600">
            {filteredProfessionals.length} profissional(is) encontrado(s)
          </p>
        </div>

        {/* Professionals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProfessionals.map((professional) => (
            <div key={professional.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-poppins font-bold text-lg text-green-deep">
                      {professional.nome.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-poppins font-semibold text-lg text-soft-black">
                        {professional.nome}
                      </h3>
                      {professional.verificado && (
                        <div className="w-5 h-5 bg-green-medium rounded-full flex items-center justify-center">
                          <Award size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="font-roboto text-sm text-gray-600 mb-2">
                      {professional.formacao}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        <span>{professional.cidade}, {professional.estado}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>{professional.experiencia} anos</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-1">
                    <Star size={16} className="text-yellow-400 fill-current" />
                    <span className="font-roboto text-sm text-gray-700">
                      {professional.avaliacao}
                    </span>
                    <span className="font-roboto text-xs text-gray-500">
                      ({professional.totalAvaliacoes})
                    </span>
                  </div>
                  {professional.valorHora && (
                    <div className="flex items-center text-green-deep">
                      <DollarSign size={14} className="mr-1" />
                      <span className="font-roboto text-sm font-medium">
                        R$ {professional.valorHora}/h
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="font-roboto text-gray-700 text-sm mb-4">
                {professional.descricao}
              </p>

              <div className="mb-4">
                <p className="font-roboto font-medium text-sm text-gray-700 mb-2">
                  Especializações:
                </p>
                <div className="flex flex-wrap gap-2">
                  {professional.especializacoes.map((especializacao, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-light bg-opacity-20 text-green-deep text-xs rounded-full font-roboto"
                    >
                      {especializacao}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="font-roboto font-medium text-sm text-gray-700 mb-2">
                  Disponibilidade:
                </p>
                <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
};

export default BuscaProfissionais;