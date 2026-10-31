import React, { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDemands } from '../../services/database';
import {
  DemandaGestaoRow,
  ROTULOS_STATUS_DEMANDA,
  montarCsvDemandasEmpresa,
} from './demandaGestao';
import { periodoDesde, ROTULOS_PERIODO } from '../admin/exportarAdmin';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const PERIODOS = ['7d', '30d', '90d', '1y'];

const RelatoriosEmpresa: React.FC = () => {
  const { currentUser } = useAuth();
  const [demandas, setDemandas] = useState<DemandaGestaoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30d');
  const [exportando, setExportando] = useState(false);

  const carregar = async () => {
    if (!currentUser) return;
    setCarregando(true);
    setErro(false);
    const result = await fetchDemands({ company_id: currentUser.id });
    if (!result.success || !Array.isArray(result.data)) {
      setErro(true);
      setCarregando(false);
      return;
    }
    setDemandas(result.data as DemandaGestaoRow[]);
    setCarregando(false);
  };

  useEffect(() => { carregar(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]);

  const desde = periodoDesde(timeFilter);
  const noPeriodo = demandas.filter((d) => new Date(d.created_at) >= desde);
  const porStatus = (lista: DemandaGestaoRow[], status: string) =>
    lista.filter((d) => d.status === status).length;

  const cards: { rotulo: string; status: string | null }[] = [
    { rotulo: 'Ativas', status: 'active' },
    { rotulo: 'Concluídas', status: 'completed' },
    { rotulo: 'Canceladas', status: 'cancelled' },
    { rotulo: 'Total', status: null },
  ];

  const exportarCsv = () => {
    setExportando(true);
    try {
      const csv = montarCsvDemandasEmpresa(noPeriodo);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liggasst-minhas-demandas-${timeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado com os dados reais das suas demandas.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
              Relatórios
            </h1>
            <p className="font-roboto text-gray-600">
              O desempenho das demandas da sua empresa, sempre com dados reais.
            </p>
          </div>
          {!carregando && !erro && demandas.length > 0 && (
            <Button onClick={exportarCsv} variant="outline" size="sm" icon={Download} loading={exportando}>
              Exportar CSV
            </Button>
          )}
        </div>

        {carregando && (
          <p className="font-roboto text-gray-500">Carregando relatório...</p>
        )}

        {erro && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={28} className="text-red-600" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
              Não foi possível carregar o relatório
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto mb-6">
              Os números só aparecem quando a leitura completa funciona; nada aqui é estimado.
            </p>
            <Button onClick={carregar} variant="outline" size="sm">
              Tentar novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && demandas.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={28} className="text-green-deep" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
              Nenhuma demanda publicada ainda
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto">
              Quando sua empresa publicar demandas, os relatórios delas aparecem aqui.
            </p>
          </div>
        )}

        {!carregando && !erro && demandas.length > 0 && (
          <>
            {/* Filtro de período */}
            <div className="flex flex-wrap gap-2 mb-6">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTimeFilter(p)}
                  className={`px-3 py-1.5 rounded-full font-roboto text-sm border transition-colors ${
                    timeFilter === p
                      ? 'bg-green-deep text-white border-green-deep'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-green-deep'
                  }`}
                >
                  {ROTULOS_PERIODO[p]}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {cards.map((c) => {
                const total = c.status === null ? demandas.length : porStatus(demandas, c.status);
                const periodo = c.status === null ? noPeriodo.length : porStatus(noPeriodo, c.status);
                return (
                  <div key={c.rotulo} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="font-roboto text-sm text-gray-500">{c.rotulo}</p>
                    <p className="font-poppins font-bold text-3xl text-soft-black">{total}</p>
                    <p className="font-roboto text-xs text-gray-400 mt-1">
                      +{periodo} no período
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Lista do período */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                Demandas no período ({ROTULOS_PERIODO[timeFilter].toLowerCase()})
              </h2>
              {noPeriodo.length === 0 ? (
                <p className="font-roboto text-sm text-gray-500">
                  Nenhuma demanda publicada neste período.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {noPeriodo.map((d) => (
                    <li key={d.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-roboto font-medium text-soft-black">{d.title}</p>
                        <p className="font-roboto text-sm text-gray-500">
                          {[d.service_type, [d.city, d.state].filter(Boolean).join(', ')]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-1 text-xs font-roboto rounded-full bg-green-light text-green-deep">
                          {ROTULOS_STATUS_DEMANDA[d.status] ?? d.status}
                        </span>
                        <p className="font-roboto text-xs text-gray-400 mt-1">
                          {new Date(d.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RelatoriosEmpresa;
