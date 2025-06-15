import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import Button from '../../components/ui/Button';

interface Contract {
  id: string;
  profissional: string;
  servico: string;
  valor: number;
  dataInicio: string;
  dataFim: string;
  status: 'ativo' | 'concluido' | 'cancelado' | 'pendente';
  progresso: number;
  descricao: string;
  especialidade: string;
}

const ContratosEmpresa: React.FC = () => {
  const [contracts] = useState<Contract[]>([
    {
      id: '1',
      profissional: 'João Silva',
      servico: 'PCMSO - Programa de Controle Médico',
      valor: 2500,
      dataInicio: '2024-01-10',
      dataFim: '2024-02-15',
      status: 'ativo',
      progresso: 65,
      descricao: 'Elaboração e implementação do PCMSO para 150 funcionários',
      especialidade: 'Técnico em Segurança do Trabalho'
    },
    {
      id: '2',
      profissional: 'Maria Santos',
      servico: 'PPRA - Programa de Prevenção',
      valor: 1800,
      dataInicio: '2023-12-01',
      dataFim: '2024-01-10',
      status: 'concluido',
      progresso: 100,
      descricao: 'Análise de riscos ambientais e elaboração do PPRA',
      especialidade: 'Engenheira de Segurança do Trabalho'
    },
    {
      id: '3',
      profissional: 'Carlos Oliveira',
      servico: 'Treinamento NR-35',
      valor: 800,
      dataInicio: '2024-01-20',
      dataFim: '2024-01-25',
      status: 'pendente',
      progresso: 0,
      descricao: 'Treinamento para trabalho em altura para 25 funcionários',
      especialidade: 'Técnico em Segurança do Trabalho'
    },
    {
      id: '4',
      profissional: 'Ana Costa',
      servico: 'LTCAT - Laudo Técnico',
      valor: 3200,
      dataInicio: '2023-11-15',
      dataFim: '2023-12-20',
      status: 'cancelado',
      progresso: 30,
      descricao: 'Laudo técnico de condições ambientais do trabalho',
      especialidade: 'Engenheira de Segurança do Trabalho'
    }
  ]);

  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-blue-100 text-blue-800';
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '':
        return <Clock size={16} className="text-blue-600" />;
      case 'concluido':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'cancelado':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'pendente':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesFilter = filter === 'todos' || contract.status === filter;
    const matchesSearch = contract.profissional.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.servico.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalValue = contracts
    .filter(c => c.status === 'concluido')
    .reduce((sum, contract) => sum + contract.valor, 0);

  const activeContracts = contracts.filter(c => c.status === 'ativo').length;

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
                Contratos
              </h1>
              <p className="font-roboto text-gray-600">
                Gerencie todos os contratos com profissionais de SST
              </p>
            </div>
            <Button icon={Plus}>
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Contratos Ativos</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {activeContracts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Total Concluídos</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {contracts.filter(c => c.status === 'concluido').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign size={24} className="text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Valor Total Investido</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  R$ {totalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User size={24} className="text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="font-roboto text-sm text-gray-600">Profissionais</p>
                <p className="font-poppins font-bold text-2xl text-soft-black">
                  {new Set(contracts.map(c => c.profissional)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por profissional ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Em Andamento</option>
                  <option value="concluido">Concluídos</option>
                  <option value="pendente">Pendentes</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <div key={contract.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-poppins font-medium text-green-deep text-sm">
                      {contract.profissional.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-soft-black mb-1">
                      {contract.servico}
                    </h3>
                    <p className="font-roboto text-gray-600 mb-1">
                      Profissional: {contract.profissional}
                    </p>
                    <p className="font-roboto text-sm text-gray-500 mb-2">
                      {contract.especialidade}
                    </p>
                    <p className="font-roboto text-sm text-gray-500">
                      {contract.descricao}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto ${getStatusColor(contract.status)}`}>
                    {getStatusIcon(contract.status)}
                    <span className="ml-1">{getStatusText(contract.status)}</span>
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      className="p-2 text-gray-400 hover:text-green-deep transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-green-deep transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <div>
                    <p className="font-roboto text-xs text-gray-500">Início</p>
                    <p className="font-roboto text-sm text-gray-900">
                      {new Date(contract.dataInicio).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <div>
                    <p className="font-roboto text-xs text-gray-500">Fim</p>
                    <p className="font-roboto text-sm text-gray-900">
                      {new Date(contract.dataFim).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <DollarSign size={16} className="text-gray-400 mr-2" />
                  <div>
                    <p className="font-roboto text-xs text-gray-500">Valor</p>
                    <p className="font-roboto text-sm text-gray-900">
                      R$ {contract.valor.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-roboto text-xs text-gray-500 mb-1">Progresso</p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-green-medium h-2 rounded-full"
                        style={{ width: `${contract.progresso}%` }}
                      ></div>
                    </div>
                    <span className="font-roboto text-sm text-gray-900">
                      {contract.progresso}%
                    </span>
                  </div>
                </div>
              </div>

              {contract.status === 'ativo' && (
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" size="sm">
                    Acompanhar Progresso
                  </Button>
                  <Button size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              )}

              {contract.status === 'pendente' && (
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                  <Button size="sm">
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          ))}

          {filteredContracts.length === 0 && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="font-poppins font-medium text-gray-900 mb-2">
                Nenhum contrato encontrado
              </h3>
              <p className="font-roboto text-gray-600">
                {searchTerm || filter !== 'todos' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Você ainda não possui contratos cadastrados'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContratosEmpresa;