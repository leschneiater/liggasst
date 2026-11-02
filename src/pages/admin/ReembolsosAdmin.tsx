// Aba admin de reembolsos: a admin analisa cada pedido com valor e cobranca
// confirmados no Asaas, e aprova (executa o estorno) ou recusa (com motivo).
// Nenhuma decisao legal e automatica: a tela so executa a decisao humana e
// mostra o resultado real (inclusive estados assincronos do estorno).
import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  adminFetchPedidosReembolso,
  adminDecidirReembolso,
  ROTULO_STATUS_REEMBOLSO,
  PedidoReembolso,
} from '../../services/reembolsos';
import { fetchProfileNames } from '../../services/database';

function formatarValor(v: number | null | undefined): string {
  if (v == null) return 'valor nao confirmado';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ReembolsosAdmin: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoReembolso[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [executando, setExecutando] = useState<string | null>(null);
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    const r = await adminFetchPedidosReembolso();
    if (!r.success) {
      setErro(r.error ?? 'Falha ao carregar.');
    } else {
      setPedidos(r.pedidos ?? []);
      const n = await fetchProfileNames((r.pedidos ?? []).map(p => p.profile_id));
      if (n.success && n.data) setNomes(n.data);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const aprovar = async (p: PedidoReembolso) => {
    const valor = formatarValor(p.pagamento?.valor ?? p.valor);
    const ok = window.confirm(
      `Aprovar o reembolso de ${valor} da cobranca ${p.asaas_payment_id}?\n\n` +
      `O estorno integral sera solicitado ao Asaas agora. No cartao, pode levar ate 10 dias uteis para aparecer na fatura.`
    );
    if (!ok) return;
    setExecutando(p.id);
    const r = await adminDecidirReembolso(p.id, 'aprovar');
    setExecutando(null);
    if (!r.success) {
      toast.error(r.error ?? 'Falha ao aprovar.');
    } else {
      toast.success(r.detalhe ?? `Estado: ${r.status}`);
    }
    await carregar();
  };

  const recusar = async (p: PedidoReembolso) => {
    if (!motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }
    setExecutando(p.id);
    const r = await adminDecidirReembolso(p.id, 'recusar', motivoRecusa.trim());
    setExecutando(null);
    setRecusandoId(null);
    setMotivoRecusa('');
    if (!r.success) {
      toast.error(r.error ?? 'Falha ao recusar.');
    } else {
      toast.success('Pedido recusado.');
    }
    await carregar();
  };

  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-poppins font-bold text-3xl text-soft-black mb-1">Reembolsos</h1>
            <p className="font-roboto text-gray-600 text-sm">
              Analise cada pedido: direitos garantidos em lei devem ser aprovados, e qualquer
              recusa precisa de base registrada. Ao aprovar, o estorno e solicitado ao Asaas na
              hora e o resultado real aparece aqui (confirmacao final chega pelo webhook).
            </p>
          </div>
          <Button variant="secondary" onClick={carregar} disabled={loading}>
            <RefreshCw size={16} className="mr-2" /> Atualizar
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="font-roboto text-sm text-amber-900">
            Contexto legal: arrependimento em ate 7 dias da contratacao gera devolucao integral
            obrigatoria (CDC, art. 49); falha do servico ou cobranca indevida tambem podem exigir
            devolucao. Quando o direito e garantido em lei, aprovar nao e discricionario. Toda
            recusa precisa de base concreta registrada no motivo; o sistema nao decide por voce.
          </p>
        </div>

        {erro && <p className="text-red-600 font-roboto mb-4">{erro}</p>}
        {loading && <p className="font-roboto text-gray-500">Carregando...</p>}
        {!loading && !erro && pedidos.length === 0 && (
          <p className="font-roboto text-gray-500">Nenhum pedido de reembolso ate agora.</p>
        )}

        {(() => {
          const ativos = pedidos.filter(p => p.status === 'pendente' || p.status === 'erro');
          const historico = pedidos.filter(p => p.status !== 'pendente' && p.status !== 'erro');
          const card = (p: PedidoReembolso) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="font-roboto text-sm text-gray-700 space-y-1">
                  <p><strong>Solicitante:</strong> {nomes[p.profile_id] ?? p.profile_id}</p>
                  <p><strong>Cobranca Asaas:</strong> {p.asaas_payment_id}</p>
                  <p><strong>Valor confirmado no Asaas:</strong> {formatarValor(p.pagamento?.valor ?? p.valor)}
                    {p.pagamento?.status ? ` (estado: ${p.pagamento.status})` : ''}</p>
                  <p><strong>Motivo do pedido:</strong> {p.motivo}</p>
                  <p><strong>Estado:</strong> {ROTULO_STATUS_REEMBOLSO[p.status]}</p>
                  {p.detalhe && (
                    <p className={p.status === 'erro' ? 'text-red-600' : undefined}>
                      <strong>Detalhe:</strong> {p.detalhe}
                    </p>
                  )}
                  <p className="text-gray-400">
                    Pedido em {new Date(p.created_at).toLocaleString('pt-BR')}
                    {p.decided_at ? `, decidido em ${new Date(p.decided_at).toLocaleString('pt-BR')}` : ''}
                  </p>
                </div>
                {(p.status === 'pendente' || p.status === 'erro') && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <Button onClick={() => aprovar(p)} disabled={executando === p.id}>
                      <CheckCircle size={16} className="mr-2" />
                      {executando === p.id ? 'Executando...' : 'Aprovar reembolso'}
                    </Button>
                    {recusandoId === p.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm font-roboto"
                          rows={2}
                          placeholder="Motivo da recusa (obrigatorio; registre a base concreta)"
                          value={motivoRecusa}
                          onChange={(e) => setMotivoRecusa(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => recusar(p)} disabled={executando === p.id}>
                            Confirmar recusa
                          </Button>
                          <Button variant="secondary" onClick={() => { setRecusandoId(null); setMotivoRecusa(''); }}>
                            Voltar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="secondary" onClick={() => setRecusandoId(p.id)} disabled={executando === p.id}>
                        <XCircle size={16} className="mr-2" /> Recusar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
          return (
            <>
              <div className="space-y-4">{ativos.map(card)}</div>
              {historico.length > 0 && (
                <>
                  <h2 className="font-poppins font-semibold text-lg text-soft-black mt-8 mb-3">
                    Historico de decisoes
                  </h2>
                  <div className="space-y-4">{historico.map(card)}</div>
                </>
              )}
            </>
          );
        })()}
      </div>
      </div>
    </div>
  );
};

export default ReembolsosAdmin;
