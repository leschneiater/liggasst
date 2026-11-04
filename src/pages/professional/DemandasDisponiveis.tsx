import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, DollarSign, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import { fetchDemands, fetchCompanies } from '../../services/database';
import { enviarProposta, fetchMinhasPropostas } from '../../services/propostas';
import { validarProposta } from '../../utils/propostasComparador';

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
  // Proposta por demanda: formulario aberto, rascunho e demandas ja com
  // proposta enviada (uma por profissional, unique no banco).
  const [formAberto, setFormAberto] = useState<string | null>(null);
  const [valor, setValor] = useState('');
  const [prazo, setPrazo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadas, setEnviadas] = useState<Record<string, boolean>>({});

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
    fetchMinhasPropostas().then((r) => {
      if (r.success && Array.isArray(r.data)) {
        const mapa: Record<string, boolean> = {};
        for (const p of r.data) mapa[p.demand_id] = true;
        setEnviadas(mapa);
      }
    });
    if (rEmpresas.success && Array.isArray(rEmpresas.data)) {
      const mapa: Record<string, string> = {};
      for (const e of rEmpresas.data as { id: string; display_name: string }[]) {
        mapa[e.id] = e.display_name;
      }
      setEmpresas(mapa);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const enviarMensagem = (d: Demanda) => {
    navigate(`/mensagens-profissional?para=${d.company_id}`, {
      state: { nome: empresas[d.company_id] || 'Empresa' }
    });
  };

  const abrirForm = (d: Demanda) => {
    setFormAberto(d.id);
    setValor('');
    setPrazo('');
    setMensagem('');
  };

  const submeterProposta = async (d: Demanda) => {
    const amount = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
    const deadlineDays = prazo.trim() === '' ? null : Number(prazo);
    const erros = validarProposta({ amount, deadlineDays, message: mensagem });
    if (erros.length > 0) {
      toast.error(erros[0]);
      return;
    }
    setEnviando(true);
    const result = await enviarProposta({ demandId: d.id, amount, deadlineDays, message: mensagem });
    setEnviando(false);
    if (!result.success) {
      toast.error(
        result.duplicada
          ? 'Você já enviou uma proposta para esta demanda.'
          : 'Não foi possível enviar a proposta. Tente novamente.',
      );
      if (result.duplicada) {
        setEnviadas((prev) => ({ ...prev, [d.id]: true }));
        setFormAberto(null);
      }
      return;
    }
    toast.success('Proposta enviada. A empresa pode responder pelo chat.');
    setEnviadas((prev) => ({ ...prev, [d.id]: true }));
    setFormAberto(null);
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
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {msgDisponivel && (
                      <Button
                        onClick={() => enviarMensagem(d)}
                        icon={MessageSquare}
                        size="sm"
                      >
                        Enviar Mensagem
                      </Button>
                    )}
                    {enviadas[d.id] ? (
                      <span className="font-roboto text-sm text-green-deep" data-testid={`proposta-enviada-${d.id}`}>
                        Proposta enviada
                      </span>
                    ) : (
                      <Button
                        onClick={() => abrirForm(d)}
                        icon={Send}
                        size="sm"
                        variant="outline"
                      >
                        Enviar Proposta
                      </Button>
                    )}
                  </div>
                </div>
                {formAberto === d.id && (
                  <div className="mt-4 bg-neutral-gray rounded-lg p-4" data-testid={`form-proposta-${d.id}`}>
                    <p className="font-roboto text-sm text-soft-black mb-3">
                      Sua proposta para esta demanda (o chat continua livre para conversar).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <label className="font-roboto text-sm text-gray-700">
                        Valor (R$, opcional)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          placeholder="A combinar"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-roboto text-sm"
                        />
                      </label>
                      <label className="font-roboto text-sm text-gray-700">
                        Prazo (dias, opcional)
                        <input
                          type="text"
                          inputMode="numeric"
                          value={prazo}
                          onChange={(e) => setPrazo(e.target.value)}
                          placeholder="Ex.: 15"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-roboto text-sm"
                        />
                      </label>
                    </div>
                    <label className="font-roboto text-sm text-gray-700 block mb-3">
                      Descrição da proposta
                      <textarea
                        value={mensagem}
                        onChange={(e) => setMensagem(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="O que você entrega, experiência e condições"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-roboto text-sm"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submeterProposta(d)} loading={enviando}>
                        Enviar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setFormAberto(null)} disabled={enviando}>
                        Cancelar
                      </Button>
                    </div>
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

export default DemandasDisponiveis;
