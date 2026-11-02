// Decisao pura de transicao de plano a partir de um evento Asaas.
// Sem IO: mesma logica exercitada pelos testes vitest do handler.
//
// POLITICA (default conservador; decisao final e da dona do produto):
// - confirmado/recebido com assinatura -> plano pago, estende current_period_end;
//   evento fora de ordem nunca regride o fim do periodo;
// - PAYMENT_OVERDUE -> past_due, plano segue ate o fim do periodo pago;
// - SUBSCRIPTION_DELETED -> status canceled, plano MANTIDO ate o fim pago;
// - estorno/chargeback do pagamento do periodo corrente -> revoga na hora;
//   de pagamento antigo -> nao derruba o periodo corrente.

export interface EventoAsaas {
  id?: string;
  event: string;
  payment?: {
    id?: string;
    subscription?: string;
    externalReference?: string;
    dueDate?: string;
    [k: string]: unknown;
  };
  subscription?: { id?: string; externalReference?: string; [k: string]: unknown };
}

export interface EstadoPlano {
  plan: string;
  status: string;
  current_period_end: string | null;
  last_paid_payment_id: string | null;
  asaas_subscription_id: string | null;
}

export const PLANO_INICIAL: EstadoPlano = {
  plan: 'free',
  status: 'none',
  current_period_end: null,
  last_paid_payment_id: null,
  asaas_subscription_id: null,
};

export interface PeriodoPago {
  asaas_payment_id: string;
  period_start: string;
  period_end: string;
  status: 'paid' | 'refunded' | 'chargeback';
}

export type Decisao =
  | { acao: 'aplicar'; patch: Partial<EstadoPlano>; periodo?: PeriodoPago; pagamentoEstornado?: { id: string; status: 'refunded' | 'chargeback' } }
  | { acao: 'ignorar'; motivo: string };

export function fimDoPeriodo(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function decidirEvento(evt: EventoAsaas, atual: EstadoPlano, planoPago = 'pro_professional'): Decisao {
  const payment = evt.payment ?? {};
  const subscriptionId = payment.subscription ?? evt.subscription?.id ?? null;
  const patch: Partial<EstadoPlano> = {};

  switch (evt.event) {
    case 'SUBSCRIPTION_CREATED':
      patch.asaas_subscription_id = subscriptionId;
      if (atual.status !== 'active' && atual.status !== 'past_due') patch.status = 'pending_first_payment';
      return { acao: 'aplicar', patch };

    case 'CHECKOUT_PAID':
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      if (!subscriptionId || !payment.id || !payment.dueDate) {
        return { acao: 'ignorar', motivo: 'pagamento sem assinatura/id/vencimento' };
      }
      const inicio = payment.dueDate;
      const fim = fimDoPeriodo(inicio);
      patch.asaas_subscription_id = subscriptionId;
      patch.plan = planoPago;
      if (!atual.current_period_end || fim > atual.current_period_end) {
        patch.current_period_end = fim;
        patch.status = 'active';
        patch.last_paid_payment_id = payment.id;
      } // fora de ordem: registra o periodo, nao regride o estado
      return {
        acao: 'aplicar',
        patch,
        periodo: { asaas_payment_id: payment.id, period_start: inicio, period_end: fim, status: 'paid' },
      };
    }

    case 'PAYMENT_OVERDUE':
      if (atual.plan === 'free') return { acao: 'ignorar', motivo: 'conta free nao tem atraso de plano' };
      return { acao: 'aplicar', patch: { status: 'past_due' } };

    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
    case 'PAYMENT_CHARGEBACK_DISPUTE': {
      if (!payment.id) return { acao: 'ignorar', motivo: 'estorno sem id de pagamento' };
      const novoStatus = evt.event === 'PAYMENT_REFUNDED' ? 'refunded' as const : 'chargeback' as const;
      const estornado = { id: payment.id, status: novoStatus };
      if (payment.id === atual.last_paid_payment_id) {
        // Revogacao imediata: o estorno e do pagamento do periodo corrente.
        return {
          acao: 'aplicar',
          patch: { plan: 'free', status: novoStatus, current_period_end: null, last_paid_payment_id: null },
          pagamentoEstornado: estornado,
        };
      }
      // Estorno de periodo antigo: registra o estorno, mantem o plano.
      return { acao: 'aplicar', patch: {}, pagamentoEstornado: estornado };
    }

    case 'SUBSCRIPTION_DELETED':
      // Cancelamento da renovacao futura: MANTEM pago ate current_period_end.
      return { acao: 'aplicar', patch: { status: 'canceled' } };

    default:
      return { acao: 'ignorar', motivo: 'evento nao mapeado: ' + evt.event };
  }
}

