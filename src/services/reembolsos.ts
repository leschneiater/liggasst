// Pedidos de reembolso: a conta solicita (insert proprio via RLS) e a admin
// decide pela edge function asaas-reembolso (aprovar executa o estorno no
// Asaas; recusar exige motivo). Nada aqui executa estorno no cliente.
import { supabase } from '../lib/supabase';

export type StatusReembolso =
  | 'pendente' | 'aprovado' | 'recusado'
  | 'estorno_em_andamento' | 'estornado' | 'erro';

export interface PedidoReembolso {
  id: string;
  created_at: string;
  profile_id: string;
  asaas_payment_id: string;
  valor: number | null;
  motivo: string;
  status: StatusReembolso;
  detalhe: string | null;
  decided_at: string | null;
  environment: string;
  pagamento?: {
    valor: number | null;
    status: string | null;
    billingType: string | null;
    paymentDate: string | null;
  } | null;
}

export const ROTULO_STATUS_REEMBOLSO: Record<StatusReembolso, string> = {
  pendente: 'Aguardando analise',
  aprovado: 'Aprovado, iniciando estorno',
  recusado: 'Recusado',
  estorno_em_andamento: 'Estorno em processamento',
  estornado: 'Estornado',
  erro: 'Falha no estorno',
};

// --- lado da conta ---

export async function solicitarReembolso(
  profileId: string,
  asaasPaymentId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('reembolso_pedidos').insert({
    profile_id: profileId,
    asaas_payment_id: asaasPaymentId,
    motivo,
  });
  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ja existe um pedido para esta cobranca.' };
    }
    return { success: false, error: 'Nao foi possivel registrar o pedido.' };
  }
  return { success: true };
}

export async function fetchMeusPedidosReembolso(): Promise<PedidoReembolso[]> {
  const { data } = await supabase
    .from('reembolso_pedidos')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as PedidoReembolso[];
}

// --- lado da admin ---

export async function adminFetchPedidosReembolso(): Promise<{
  success: boolean;
  pedidos?: PedidoReembolso[];
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('asaas-reembolso', {
    body: { acao: 'listar' },
  });
  if (error) return { success: false, error: 'Falha ao carregar pedidos.' };
  if (data?.error) return { success: false, error: String(data.error) };
  return { success: true, pedidos: (data?.pedidos ?? []) as PedidoReembolso[] };
}

export async function adminDecidirReembolso(
  pedidoId: string,
  acao: 'aprovar' | 'recusar',
  detalhe?: string,
): Promise<{ success: boolean; status?: StatusReembolso; detalhe?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('asaas-reembolso', {
    body: { acao, pedido_id: pedidoId, detalhe },
  });
  if (error) return { success: false, error: 'Falha ao executar a decisao.' };
  if (data?.error) return { success: false, error: String(data.error) };
  return { success: true, status: data?.status, detalhe: data?.detalhe };
}
