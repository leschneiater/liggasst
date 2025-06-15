import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import Button from '../../components/ui/Button';

const RelatoriosEmpresa: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days');
  const [selectedReport, setSelectedReport] = useState('overview');

  const periods = [
    { value: 'last-7-days', label: 'Últimos 7 dias' },
    { value: 'last-30-days', label: 'Últimos 30 dias' },
    { value: 'last-3-months', label: 'Últimos 3 meses' },
    { value: 'last-6-months', label: 'Últimos 6 meses' },
    { value: 'last-year', label: 'Último ano' },
    { value: 'custom', label: 'Período personalizado' }
  ];

  const reportTypes = [
    { value: 'overview', label: 'Visão Geral' },
    { value: 'professionals', label: 'Profissionais' },
    { value: 'contracts', label: 'Contratos' },
    { value: 'financial', label: 'Financeiro' },
    { value: 'performance', label: 'Performance' }
  ];

  // Mock data
  const overviewStats = {
    totalContracts: 12,
    activeContracts: 3,
    completedContracts: 8,
    totalInvestment: 25600,
    averageContractValue: 2133,
    professionalsSatisfaction: 4.7,
    responseTime: 2.4,
    contractCompletionRate: 92
  };

  const contractsData = [
    {
      month: 'Jan',
      contracts: 4,
      value: 8500
    },
    {
      month: 'Fev',
      contracts: 3,
      value: 6200
    },
    {
      month: 'Mar',
      contracts: 5,
      value: 10900
    }
  ];

  const topProfessionals = [
    {
      name: 'João Silva',
      specialty: 'Técnico em Segurança',
      contracts: 3,
      rating: 4.9,
      totalValue: 7500
    },
    {
      name: 'Maria Santos',
      specialty: 'Engenheira de Segurança',
      contracts: 2,
      rating: 4.8,
      totalValue: 5600
    },
    {
      name: 'Carlos Oliveira',
      specialty: 'Técnico em Segurança',
      contracts: 2,
      rating: 4.7,
      totalValue: 4200
    }
  ];

  const handleDownloadReport = () => {
    // Simular download do relatório
    const reportName = `relatorio-${selectedReport}-${selectedPeriod}.pdf`;
    console.log(`Downloading: ${reportName}`);
    // Aqui você implementaria o download real
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
                Relatórios
              </h1>
              <p className="font-roboto text-gray-600">
                Acompanhe o desempenho e resultados dos seus projetos de SST
              </p>
            </div>
            <Button icon={Download} onClick={handleDownloadReport}>
              Baixar Relatório
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-roboto font-medium text-sm text-gray-700 mb-1">
                Período
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" icon={Filter} fullWidth>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {selectedReport === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={24} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-roboto text-sm text-gray-600">Total de Contratos</p>
                    <p className="font-poppins font-bold text-2xl text-soft-black">
                      {overviewStats.totalContracts}
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
                    <p className="font-roboto text-sm text-gray-600">Contratos Ativos</p>
                    <p className="font-poppins font-bold text-2xl text-soft-black">
                      {overviewStats.activeContracts}
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
                    <p className="font-roboto text-sm text-gray-600">Investimento Total</p>
                    <p className="font-poppins font-bold text-2xl text-soft-black">
                      R$ {overviewStats.totalInvestment.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={24} className="text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-roboto text-sm text-gray-600">Taxa de Conclusão</p>
                    <p className="font-poppins font-bold text-2xl text-soft-black">
                      {overviewStats.contractCompletionRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Contracts Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Contratos por Mês
                </h3>
                <div className="space-y-4">
                  {contractsData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-roboto text-gray-700">{data.month}</span>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-medium h-2 rounded-full"
                            style={{ width: `${(data.contracts / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-roboto text-sm text-gray-600 w-16">
                          {data.contracts} contratos
                        </span>
                        <span className="font-roboto text-sm text-green-deep font-medium w-20">
                          R$ {data.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Métricas de Performance
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-roboto text-gray-700">Satisfação dos Profissionais</span>
                      <span className="font-roboto font-medium text-green-deep">
                        {overviewStats.professionalsSatisfaction}/5.0
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-medium h-2 rounded-full"
                        style={{ width: `${(overviewStats.professionalsSatisfaction / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-roboto text-gray-700">Tempo Médio de Resposta</span>
                      <span className="font-roboto font-medium text-blue-600">
                        {overviewStats.responseTime}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.max(0, 100 - (overviewStats.responseTime / 24) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-roboto text-gray-700">Taxa de Conclusão</span>
                      <span className="font-roboto font-medium text-purple-600">
                        {overviewStats.contractCompletionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${overviewStats.contractCompletionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Professionals */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Principais Profissionais
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left font-roboto font-medium text-gray-700 pb-3">Profissional</th>
                      <th className="text-left font-roboto font-medium text-gray-700 pb-3">Especialidade</th>
                      <th className="text-center font-roboto font-medium text-gray-700 pb-3">Contratos</th>
                      <th className="text-center font-roboto font-medium text-gray-700 pb-3">Avaliação</th>
                      <th className="text-right font-roboto font-medium text-gray-700 pb-3">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProfessionals.map((professional, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-light rounded-full flex items-center justify-center">
                              <span className="font-poppins font-medium text-green-deep text-xs">
                                {professional.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="font-roboto text-gray-900">{professional.name}</span>
                          </div>
                        </td>
                        <td className="py-3 font-roboto text-gray-600">{professional.specialty}</td>
                        <td className="py-3 text-center font-roboto text-gray-900">{professional.contracts}</td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="font-roboto text-gray-900">{professional.rating}</span>
                            <div className="text-yellow-400">★</div>
                          </div>
                        </td>
                        <td className="py-3 text-right font-roboto text-green-deep font-medium">
                          R$ {professional.totalValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Other Report Types */}
        {selectedReport !== 'overview' && (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <BarChart3 size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="font-poppins font-medium text-gray-900 mb-2">
              Relatório {reportTypes.find(r => r.value === selectedReport)?.label}
            </h3>
            <p className="font-roboto text-gray-600 mb-6">
              Este relatório está sendo preparado. Em breve estará disponível.
            </p>
            <Button variant="outline">
              Solicitar Relatório Personalizado
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatoriosEmpresa;