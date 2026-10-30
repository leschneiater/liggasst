import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import { fetchDemands, fetchCompanies } from '../../services/database';

interface Demanda {
  id: string;
  company_id: string;
  title: string;
  description: string;
  service_type: string | null;
  city: string | null;
  state: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

const DemandasDisponiveis: React.FC = () => {
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const { disponivel: msgDisponivel } = useMessagingDisponivel();
  const [empresas, setEmpresas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setError(false);
    const [rDemandas, rEmpresas] = await Promise.all([
      fetchDemands({ status: 'active' }),
      fetchCompanies()
    ]);
    if (!rDemandas.success || !Array.isArray(rDemandas.data)) {
      setError(true);
      setLoading(false);
      return;
    }
    setDemandas(rDemandas.data as Demanda[]);
    if (rEmpresas.success && Array.isArray(rEmpresas.data)) {
      const mapa: Record<string, string> = {};
      for (const e of rEmpresas.data as { id: string; display_name: string }[]) {
        mapa[e.id] = e.display_name;
      }
      setEmpresas(mapa);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enviarMensagem = (d: Demanda) => {
    navigate(`/mensagens-profissional?para=${d.company_id}`, {
      state: { nome: empresas[d.company_id] || 'Empresa' }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Demandas Disponíveis
          </h1>
          <p className="font-roboto text-gray-600">
            Demandas publicadas pelas empresas cadastradas
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Carregando demandas...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar as demandas.</p>
            <button onClick={carregar} className="text-green-deep font-roboto font-medium hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && demandas.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Nenhuma demanda publicada no momento.</p>
          </div>
        )}

        {!loading && !error && demandas.length > 0 && (
          <div className="space-y-4">
            {demandas.map(d => (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-poppins font-semibold text-lg text-soft-black mb-1">{d.title}</h2>
                    <p className="font-roboto text-sm text-gray-500 mb-2">
                      {empresas[d.company_id] || 'Empresa cadastrada'}
                    </p>
                    <p className="font-roboto text-sm text-gray-600 whitespace-pre-wrap break-words mb-3">
                      {d.description}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-roboto text-sm text-gray-500">
                      {(d.city || d.state) && (
                        <span className="flex items-center"><MapPin size={14} className="mr-1" />{[d.city, d.state].filter(Boolean).join(', ')}</span>
                      )}
                      {d.budget != null && (
                        <span className="flex items-center"><DollarSign size={14} className="mr-1" />Orçamento: R$ {Number(d.budget).toLocaleString('pt-BR')}</span>
                      )}
                      {d.deadline && (
                        <span className="flex items-center"><Calendar size={14} className="mr-1" />Prazo: {new Date(d.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      )}
                      {d.service_type && <span>{d.service_type}</span>}
                    </div>
                  </div>
                  {msgDisponivel && (
                  <Button
                      onClick={() => enviarMensagem(d)}
                      icon={MessageSquare}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      Enviar Mensagem
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandasDisponiveis;
