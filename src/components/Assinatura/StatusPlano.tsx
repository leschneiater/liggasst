// StatusPlano: cartao com o plano REAL da conta (lido de public.subscriptions,
// mantida pelo webhook do Asaas sandbox). Versao de testes.
//
// Regras:
// - fora do modo de teste (VITE_BILLING_TEST_MODE) e fora da allowlist de
//   contas de teste (VITE_BILLING_TEST_ACCOUNTS), o cartao so EXIBE o plano;
// - "Assinar (teste)" abre o formulario de dados de cobranca (o Asaas exige
//   CPF/CNPJ + endereco completo — o perfil do Ligga nao coleta isso hoje) e
//   chama a edge function asaas-checkout, que devolve a pagina hospedada de
//   pagamento de TESTE (sandbox, sem cobranca real);
// - cancelamento pelo app: botao atras de VITE_BILLING_CANCEL_ENABLED (OFF);
//   chama asaas-cancelar; o plano pago segue ate o fim do periodo pago.
import React, { useEffect, useState } from 'react';
import { Star, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAssinatura, criarCheckoutTeste, cancelarAssinatura } from '../../services/assinatura';
import { solicitarReembolso, fetchMeusPedidosReembolso, ROTULO_STATUS_REEMBOLSO, PedidoReembolso } from '../../services/reembolsos';
import type { Assinatura } from '../../services/assinatura';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

// Lido em cada render (e nao no modulo) para o gate ser testavel e trocar
// com o build de cada ambiente.
const testModeAtivo = () => import.meta.env.VITE_BILLING_TEST_MODE === 'true';
// Cancelamento pelo app: flag OFF por padrao (build do Pages nao define).
// Contratacao real: flag OFF por padrao (build do Pages nao define).
const contratoAtivo = () => import.meta.env.VITE_BILLING_CONTRACT_ENABLED === 'true';
const cancelamentoAtivo = () => import.meta.env.VITE_BILLING_CANCEL_ENABLED === 'true';
const contasDeTeste = (): string[] =>
  (import.meta.env.VITE_BILLING_TEST_ACCOUNTS ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

const NOMES_PLANO: Record<string, string> = {
  free: 'Gratuito',
  pro_professional: 'Profissional (teste)',
  pro_company: 'Empresa (teste)',
};

const NOMES_PLANO_PROD: Record<string, string> = {
  free: 'Gratuito',
  pro_professional: 'Profissional',
  pro_company: 'Empresa',
};

function textoStatusBase(a: Assinatura): string {
  const emTeste = a.environment !== 'production';
  const fim = a.current_period_end
    ? new Date(a.current_period_end + 'T00:00:00').toLocaleDateString('pt-BR')
    : null;
  switch (a.status) {
    case 'active':
      return a.plan === 'free' ? 'Voce esta no plano gratuito' : `Plano pago ativo ate ${fim}`;
    case 'pending_first_payment':
      if (emTeste) return 'Aguardando o primeiro pagamento (checkout de teste em aberto)';
      // Producao: o plano segue gratuito ate o pagamento ser confirmado. Nao afirma
      // que o checkout esta aberto nem que foi cancelado (a linha nao guarda isso).
      return a.plan === 'free'
        ? 'Contratação não concluída. Você segue no plano gratuito. Se acabou de pagar, a confirmação pode levar alguns minutos.'
        : 'Aguardando o primeiro pagamento';
    case 'past_due':
      return `Pagamento em atraso; plano pago garantido ate ${fim}`;
    case 'canceled':
      return fim ? `Assinatura cancelada; plano pago continua ate ${fim}` : 'Assinatura cancelada';
    case 'refunded':
      return 'Pagamento estornado; plano gratuito';
    case 'chargeback':
      return 'Pagamento contestado; plano gratuito';
    default:
      return a.status;
  }
}

// Assinaturas que nao sao de producao (hoje todas as pagas) sao de TESTE:
// pagamento no sandbox do Asaas, sem cobranca real. Nunca exibir como real.
function textoStatus(a: Assinatura): string {
  const base = textoStatusBase(a);
  const pagoDeTeste = a.plan !== 'free' && a.environment !== 'production';
  return pagoDeTeste ? `${base} (assinatura de TESTE, sem cobranca real)` : base;
}

interface Props {
  papel: 'professional' | 'company';
}

const StatusPlano: React.FC<Props> = ({ papel }) => {
  const { currentUser } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abrindoCheckout, setAbrindoCheckout] = useState(false);
  const [pedidosReembolso, setPedidosReembolso] = useState<PedidoReembolso[]>([]);
  const [abrindoReembolso, setAbrindoReembolso] = useState(false);
  const [motivoReembolso, setMotivoReembolso] = useState('');
  const [enviandoReembolso, setEnviandoReembolso] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [form, setForm] = useState({
    nome: '', email: '', cpfCnpj: '', postalCode: '', address: '', addressNumber: '', province: '', phone: '',
  });

  const contaDeTeste = testModeAtivo() && !!currentUser && contasDeTeste().includes(currentUser.id);

  useEffect(() => {
    let vivo = true;
    if (!currentUser) { setCarregando(false); return; }
    fetchAssinatura(currentUser.id)
      .then((a) => { if (vivo) setAssinatura(a); })
      .catch(() => { if (vivo) setAssinatura(null); })
      .finally(() => { if (vivo) setCarregando(false); });
    fetchMeusPedidosReembolso()
      .then((p) => { if (vivo) setPedidosReembolso(p); })
      .catch(() => { /* lista best-effort */ });
    return () => { vivo = false; };
  }, [currentUser]);

  const exibida: Assinatura = assinatura ?? { plan: 'free', status: 'active', current_period_end: null };
  const Icone = exibida.plan === 'free' ? Star : Zap;

  const assinar = async () => {
    if (!currentUser || !aceitouTermos) return;
    setAbrindoCheckout(true);
    try {
      const { url } = await criarCheckoutTeste({ profileId: currentUser.id, papel, faturamento: form });
      if (url) window.open(url, '_blank', 'noopener');
      else toast.error(contratoAtivo() ? 'Checkout criado, mas sem URL retornada' : 'Checkout de teste criado, mas sem URL retornada');
    } catch {
      toast.error(contratoAtivo() ? 'Nao foi possivel abrir o checkout' : 'Nao foi possivel abrir o checkout de teste');
    } finally {
      setAbrindoCheckout(false);
    }
  };

  const campo = (key: keyof typeof form, label: string, placeholder = '') => (
    <label key={key} className="block text-left">
      <span className="font-roboto text-xs text-gray-600">{label}</span>
      <input
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8" data-testid="status-plano">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center">
          <Icone size={24} className="text-green-deep" />
        </div>
        <div>
          <h2 className="font-poppins font-bold text-xl text-soft-black">
            Plano {(exibida.environment === 'production' ? NOMES_PLANO_PROD[exibida.plan] : NOMES_PLANO[exibida.plan]) ?? exibida.plan}
          </h2>
          <p className="font-roboto text-gray-600">
            {carregando ? 'Carregando...' : textoStatus(exibida)}
          </p>
        </div>
      </div>

      {cancelamentoAtivo() && exibida.plan !== 'free' && (exibida.status === 'active' || exibida.status === 'past_due') && (
        <div className="mt-6 border-t border-gray-100 pt-4" data-testid="cancelar-assinatura">
          <p className="font-roboto text-xs text-gray-500 mb-2">
            Sem multa e sem fidelidade. Ao cancelar, as proximas cobrancas param e o plano pago continua ate o fim do periodo ja pago.
          </p>
          <Button
            variant="secondary"
            disabled={cancelando}
            onClick={async () => {
              if (!window.confirm('Cancelar a assinatura? O plano pago continua ate o fim do periodo ja pago.')) return;
              setCancelando(true);
              const r = await cancelarAssinatura();
              setCancelando(false);
              if (!r.ok) { toast.error(r.erro ?? 'Nao foi possivel cancelar'); return; }
              toast.success('Assinatura cancelada. O plano pago continua ate o fim do periodo ja pago.');
              if (currentUser) fetchAssinatura(currentUser.id).then(setAssinatura).catch(() => undefined);
            }}
          >
            {cancelando ? 'Cancelando...' : 'Cancelar assinatura'}
          </Button>
        </div>
      )}

      {exibida.plan !== 'free' && exibida.last_paid_payment_id && (
        <div className="mt-6 border-t border-gray-100 pt-4" data-testid="solicitar-reembolso">
          {(() => {
            const pedido = pedidosReembolso.find(p => p.asaas_payment_id === exibida.last_paid_payment_id);
            if (pedido) {
              return (
                <p className="font-roboto text-sm text-gray-600">
                  Reembolso da ultima cobranca: <strong>{ROTULO_STATUS_REEMBOLSO[pedido.status]}</strong>
                  {pedido.detalhe ? ` - ${pedido.detalhe}` : ''}
                </p>
              );
            }
            if (!abrindoReembolso) {
              return (
                <Button variant="secondary" onClick={() => setAbrindoReembolso(true)}>
                  Solicitar reembolso da ultima cobranca
                </Button>
              );
            }
            return (
              <div className="space-y-2">
                <p className="font-roboto text-xs text-gray-500">
                  A administracao analisa o pedido; direitos garantidos em lei (como arrependimento
                  em ate 7 dias) sao sempre cumpridos. Se aprovado, o estorno e solicitado ao
                  Asaas (processador do pagamento) e o resultado aparece aqui.
                </p>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Motivo do pedido de reembolso"
                  value={motivoReembolso}
                  onChange={(e) => setMotivoReembolso(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={enviandoReembolso || !motivoReembolso.trim()}
                    onClick={async () => {
                      if (!currentUser || !exibida.last_paid_payment_id) return;
                      setEnviandoReembolso(true);
                      const r = await solicitarReembolso(currentUser.id, exibida.last_paid_payment_id, motivoReembolso.trim());
                      setEnviandoReembolso(false);
                      if (!r.success) {
                        toast.error(r.error ?? 'Nao foi possivel registrar o pedido');
                        return;
                      }
                      toast.success('Pedido de reembolso registrado para analise');
                      setAbrindoReembolso(false);
                      setMotivoReembolso('');
                      const p = await fetchMeusPedidosReembolso();
                      setPedidosReembolso(p);
                    }}
                  >
                    {enviandoReembolso ? 'Enviando...' : 'Enviar pedido'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setAbrindoReembolso(false); setMotivoReembolso(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            );
          })()}
          {pedidosReembolso.filter(p => p.asaas_payment_id !== exibida.last_paid_payment_id).length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3" data-testid="reembolsos-anteriores">
              <p className="font-roboto text-xs text-gray-500 mb-1">Pedidos de reembolso anteriores:</p>
              {pedidosReembolso
                .filter(p => p.asaas_payment_id !== exibida.last_paid_payment_id)
                .map(p => (
                  <p key={p.id} className="font-roboto text-sm text-gray-600">
                    Cobranca {p.asaas_payment_id}: <strong>{ROTULO_STATUS_REEMBOLSO[p.status]}</strong>
                    {p.detalhe ? ` - ${p.detalhe}` : ''}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {(contaDeTeste || contratoAtivo()) && exibida.plan === 'free' && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          {contratoAtivo() ? (
            <p className="font-roboto text-xs text-gray-600 mb-3" data-testid="aviso-primeira-cobranca">
              A primeira mensalidade e cobrada no ato da contratacao, sem periodo de teste gratis. Cancele quando quiser, sem multa e sem fidelidade.
            </p>
          ) : (
            <p className="font-roboto text-xs text-amber-700 flex items-center gap-1 mb-3">
              <AlertTriangle size={14} /> Ambiente de TESTES: pagamento no sandbox do Asaas, sem cobranca real.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {campo('nome', 'Nome completo (faturamento)')}
            {campo('email', 'E-mail', 'voce@example.com')}
            {campo('cpfCnpj', 'CPF ou CNPJ', '000.000.000-00')}
            {campo('phone', 'Celular (obrigatorio no Asaas)', '(11) 99999-0000')}
            {campo('postalCode', 'CEP', '00000-000')}
            {campo('address', 'Endereco')}
            {campo('addressNumber', 'Numero')}
            {campo('province', 'Bairro')}
          </div>
          <label className="flex items-start gap-2 mb-3 text-left" data-testid="aceite-termos">
            <input
              type="checkbox"
              required
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-green-deep focus:ring-green-deep"
            />
            <span className="font-roboto text-sm text-gray-700">
              Li e aceito os{' '}
              <a href={`${import.meta.env.BASE_URL}termos-de-uso/`} target="_blank" rel="noopener noreferrer" className="text-green-deep underline">Termos de Uso</a>
              {' '}e a{' '}
              <a href={`${import.meta.env.BASE_URL}politica-de-privacidade/`} target="_blank" rel="noopener noreferrer" className="text-green-deep underline">Política de Privacidade</a>.
            </span>
          </label>
          <Button onClick={assinar} disabled={abrindoCheckout || !aceitouTermos}>
            {abrindoCheckout ? 'Abrindo checkout...' : (contratoAtivo() ? 'Assinar' : 'Assinar (teste)')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default StatusPlano;
