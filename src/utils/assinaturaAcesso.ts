// Regra de acesso pago: plano pro (profissional ou empresa) ativo, ou
// cancelado/em atraso ainda dentro do periodo pago — E assinatura de
// PRODUCAO (sandbox nao vira acesso pago real; mesma regra da RLS de
// public.radar_posts). Usada pelo Radar TST.
// Fail-closed: qualquer ausencia de dado ou data invalida NEGA acesso.
import type { Assinatura } from '../services/assinatura';

export function assinaturaPagaAtiva(a: Assinatura | null, hoje: Date = new Date()): boolean {
  if (!a) return false;
  if (a.environment !== 'production') return false;
  if (a.plan !== 'pro_professional' && a.plan !== 'pro_company') return false;
  if (a.status === 'active') return true;
  if ((a.status === 'canceled' || a.status === 'past_due') && a.current_period_end) {
    const fim = new Date(a.current_period_end + 'T23:59:59');
    return !Number.isNaN(fim.getTime()) && fim >= hoje;
  }
  return false;
}
