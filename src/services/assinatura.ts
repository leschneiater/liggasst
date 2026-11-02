// Leitura do plano da conta logada (public.subscriptions) e chamada do
// checkout de TESTE (sandbox Asaas). Versao de testes: o plano exibido vem
// sempre da tabela (mantida pelo webhook), nunca de estado local.
import { funcaoBilling } from './billingEndpoints';
import { supabase } from '../lib/supabase';

export interface Assinatura {
  plan: 'free' | 'pro_professional' | 'pro_company';
  status: 'active' | 'pending_first_payment' | 'past_due' | 'canceled' | 'refunded' | 'chargeback';
  current_period_end: string | null;
  last_paid_payment_id?: string | null;
  environment?: 'sandbox' | 'production';
}

export async function fetchAssinatura(profileId: string): Promise<Assinatura | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, last_paid_payment_id, environment')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as Assinatura | null;
}

export interface CheckoutTestePayload {
  profileId: string;
  papel: 'professional' | 'company';
  faturamento: {
    nome: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    province: string;
    phone: string;
  };
}

export async function criarCheckoutTeste(payload: CheckoutTestePayload): Promise<{ url: string | null }> {
  const { data, error } = await supabase.functions.invoke(funcaoBilling('asaas-checkout'), { body: payload });
  if (error) throw error;
  return data as { url: string | null };
}

// Cancelamento pela propria conta (edge function asaas-cancelar). O servidor
// confere o JWT, o customer no Asaas e so marca cancelada depois que o Asaas
// confirma; o acesso segue ate o fim do periodo ja pago.
export async function cancelarAssinatura(): Promise<{ ok: boolean; acessoAte: string | null; erro?: string }> {
  const { data, error } = await supabase.functions.invoke(funcaoBilling('asaas-cancelar'), { body: {} });
  if (error) return { ok: false, acessoAte: null, erro: 'Nao foi possivel cancelar agora' };
  const r = data as { ok?: boolean; acessoAte?: string | null; error?: string };
  return r?.ok ? { ok: true, acessoAte: r.acessoAte ?? null } : { ok: false, acessoAte: null, erro: r?.error ?? 'Nao foi possivel cancelar agora' };
}
