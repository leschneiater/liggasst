// Comparador de propostas de uma demanda (recurso do plano Empresa pago).
// Conta free ve a contagem real + aviso com caminho para /planos; a
// comparacao lado a lado (preco, prazo, certificados, avaliacoes) e paga.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Star, Award, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AvisoLimitesPlano from '../../components/AvisoLimitesPlano';
import { usePlanoPago } from '../../hooks/usePlanoPago';
import { fetchDemands, fetchProfileNames, fetchSharedCertificates, avaliacoesResumo } from '../../services/database';
import { atualizarStatusProposta, fetchPropostasDaDemanda } from '../../services/propostas';
import {
  PropostaRow,
  ROTULOS_STATUS_PROPOSTA,
  ordenarParaComparacao,
} from '../../utils/propostasComparador';
import type { DemandaGestaoRow } from './demandaGestao';

interface ExtrasProfissional {
  nome: string;
  mediaAvaliacoes: number | null;
  totalAvaliacoes: number;
  certificadosVisiveis: number;
}

const ComparadorPropostas: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planoPago = usePlanoPago();
  const [demanda, setDemanda] = useState<DemandaGestaoRow | null>(null);
  const [propostas, setPropostas] = useState<PropostaRow[]>([]);
  const [extras, setExtras] = useState<Record<string, ExtrasProfissional>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ id: string; acao: 'accepted' | 'declined' } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState(false);

  const carregar = async () => {
    if (!id) return;
    setLoading(true);
    setErro(false);
    const [rDemanda, rPropostas] = await Promise.all([
      fetchDemands({ id }),
      fetchPropostasDaDemanda(id),
    ]);
    const listaDemandas = rDemanda.success && Array.isArray(rDemanda.data) ? (rDemanda.data as DemandaGestaoRow[]) : [];
    if (!rPropostas.success || listaDemandas.length === 0) {
      setErro(true);
      setLoading(false);
      return;
    }
    setDemanda(listaDemandas[0]);
    const lista = (rPropostas.data ?? []) as PropostaRow[];
    setPropostas(lista);

    const nomes: Record<string, string> = {};
    const ids = [...new Set(lista.map((p) => p.professional_id))];
    const rNomes = await fetchProfileNames(ids);
    if (rNomes.success) Object.assign(nomes, rNomes.data);
    const mapa: Record<string, ExtrasProfissional> = {};
    await Promise.all(
      ids.map(async (pid) => {
        const [resumo, certs] = await Promise.all([
          avaliacoesResumo(pid).catch(() => ({ media: null, total: 0 })),
          fetchSharedCertificates(pid).catch(() => ({ success: false, data: [] })),
        ]);
        const listaCerts = (certs as { success: boolean; data?: unknown[] }).data;
        mapa[pid] = {
          nome: nomes[pid] || 'Profissional',
          mediaAvaliacoes: resumo.media,
          totalAvaliacoes: resumo.total,
          certificadosVisiveis: Array.isArray(listaCerts) ? listaCerts.length : 0,
        };
      }),
    );
    setExtras(mapa);
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const executarAcao = async () => {
    if (!confirmacao) return;
    setAcaoLoading(true);
    const result = await atualizarStatusProposta(confirmacao.id, confirmacao.acao);
    setAcaoLoading(false);
    if (!result.success) {
      toast.error(
        (result as { conflict?: boolean }).conflict
          ? 'Esta proposta já foi decidida. A lista foi atualizada.'
          : 'Não foi possível atualizar a proposta. Tente novamente.',
      );
      setConfirmacao(null);
      carregar();
      return;
    }
    toast.success(confirmacao.acao === 'accepted' ? 'Proposta aceita.' : 'Proposta recusada.');
    setConfirmacao(null);
    carregar();
  };

  const ordenadas = ordenarParaComparacao(propostas);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/dashboard-empresa')}>
            Voltar ao painel
          </Button>
        </div>
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Propostas recebidas
          </h1>
          <p className="font-roboto text-gray-600">
            {demanda ? demanda.title : 'Demanda'}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Carregando propostas...</p>
          </div>
        )}

        {erro && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar as propostas desta demanda.</p>
            <button onClick={carregar} className="text-green-deep font-roboto font-medium hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && propostas.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Nenhuma proposta nesta demanda ainda.</p>
          </div>
        )}

        {!loading && !erro && propostas.length > 0 && (
          <>
            {!planoPago && (
              <>
                <p className="font-roboto text-sm text-gray-600 mb-4" data-testid="contagem-propostas">
                  {propostas.length === 1 ? '1 proposta recebida.' : `${propostas.length} propostas recebidas.`}
                </p>
                <AvisoLimitesPlano tipo="comparador" pago={planoPago} />
              </>
            )}
            {planoPago && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="comparador-propostas">
                {ordenadas.map((p) => {
                  const ex = extras[p.professional_id];
                  return (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="font-poppins font-semibold text-lg text-soft-black">
                          {ex?.nome ?? 'Profissional'}
                        </h2>
                        <span className="inline-block px-2 py-1 text-xs font-roboto rounded-full bg-green-light text-green-deep shrink-0">
                          {ROTULOS_STATUS_PROPOSTA[p.status]}
                        </span>
                      </div>
                      <p className="font-roboto text-sm text-gray-700 mb-1">
                        {p.amount != null ? `R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor a combinar'}
                        {p.deadline_days != null ? ` • Prazo: ${p.deadline_days} dia${p.deadline_days === 1 ? '' : 's'}` : ''}
                      </p>
                      <p className="font-roboto text-sm text-gray-600 whitespace-pre-wrap break-words mb-3 flex-1">
                        {p.message}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-roboto text-sm text-gray-500 mb-4">
                        <span className="flex items-center">
                          <Star size={14} className="mr-1" />
                          {ex && ex.totalAvaliacoes > 0 && ex.mediaAvaliacoes != null
                            ? `${ex.mediaAvaliacoes.toFixed(1)} (${ex.totalAvaliacoes === 1 ? '1 avaliação' : `${ex.totalAvaliacoes} avaliações`})`
                            : 'Sem avaliações ainda'}
                        </span>
                        <span className="flex items-center">
                          <Award size={14} className="mr-1" />
                          {ex ? `${ex.certificadosVisiveis} ${ex.certificadosVisiveis === 1 ? 'certificado visível' : 'certificados visíveis'}` : '...'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button as={Link} to={`/perfil-profissional-publico/${p.professional_id}`} variant="outline" size="sm" icon={User}>
                          Perfil
                        </Button>
                        <Button as={Link} to={`/mensagens-empresa?para=${p.professional_id}`} variant="outline" size="sm" icon={MessageSquare}>
                          Conversar
                        </Button>
                        <Button as={Link} to={`/propor-contrato/${p.professional_id}`} variant="outline" size="sm" icon={FileText}>
                          Contrato
                        </Button>
                      </div>
                      {p.status === 'pending' && confirmacao?.id !== p.id && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => setConfirmacao({ id: p.id, acao: 'accepted' })}>
                            Aceitar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmacao({ id: p.id, acao: 'declined' })}>
                            Recusar
                          </Button>
                        </div>
                      )}
                      {confirmacao?.id === p.id && (
                        <div className="mt-3 bg-neutral-gray rounded-lg p-3">
                          <p className="font-roboto text-sm text-soft-black mb-2">
                            {confirmacao.acao === 'accepted'
                              ? 'Aceitar esta proposta? Combine os próximos passos pelo chat ou proponha o contrato.'
                              : 'Recusar esta proposta? O profissional verá o status atualizado.'}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={executarAcao} loading={acaoLoading}>
                              Confirmar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmacao(null)} disabled={acaoLoading}>
                              Voltar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ComparadorPropostas;
