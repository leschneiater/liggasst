// Leitura do plano da conta logada (public.subscriptions) e chamada do
// checkout de TESTE (sandbox Asaas). Versao de testes: o plano exibido vem
// sempre da tabela (mantida pelo webhook), nunca de estado local.
import { supabase } from '../lib/supabase';

export interface Assinatura {
  plan: 'free' | 'pro_professional' | 'pro_company';
  status: 'active' | 'pending_first_payment' | 'past_due' | 'canceled' | 'refunded' | 'chargeback';
  current_period_end: string | null;
  environment?: 'sandbox' | 'production';
}

export async function fetchAssinatura(profileId: string): Promise<Assinatura | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, environment')
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
  const { data, error } = await supabase.functions.invoke('asaas-checkout', { body: payload });
  if (error) throw error;
  return data as { url: string | null };
}
