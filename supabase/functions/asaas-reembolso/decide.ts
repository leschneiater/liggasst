// Logica pura da decisao de reembolso (sem IO; exercitada por vitest).
// NENHUMA decisao legal e automatica: a function so executa a decisao humana
// da admin. Contexto legal (arrependimento 7 dias, falha/cobranca indevida)
// aparece na tela como aviso, nao como regra de bloqueio.

export type StatusPedido =
  | 'pendente' | 'aprovado' | 'recusado'
  | 'estorno_em_andamento' | 'estornado' | 'erro';

export type AcaoAdmin = 'aprovar' | 'recusar';

// Decisao so acontece uma vez por estado valido. Reaprovacao apos 'erro'
// e permitida porque 'erro' significa que o Asaas REJEITOU a operacao
// (ex.: saldo insuficiente) e nada foi devolvido.
export function validarTransicao(
  status: StatusPedido,
  acao: AcaoAdmin,
): { ok: true } | { ok: false; erro: string } {
  if (acao === 'recusar' && status !== 'pendente') {
    return { ok: false, erro: `pedido ja decidido (${status})` };
  }
  if (acao === 'aprovar' && status !== 'pendente' && status !== 'erro') {
    return { ok: false, erro: `pedido ja decidido (${status})` };
  }
  return { ok: true };
}

// Cobranca estornavel no Asaas: cartao confirmado/recebido (Pix idem; a
// plataforma so cobra cartao, mas o check nao assume). Estados que indicam
// devolucao ja existente impedem novo estorno (camada anti-dupla).
export function pagamentoEstornavel(statusAsaas: string): boolean {
  return statusAsaas === 'RECEIVED' || statusAsaas === 'CONFIRMED';
}

export function estadoAposResposta(
  httpOk: boolean,
  body: { status?: string; errors?: { description?: string }[] } | null,
): { status: StatusPedido; detalhe: string } {
  if (!httpOk) {
    const motivo = body?.errors?.[0]?.description ?? 'erro desconhecido do Asaas';
    return { status: 'erro', detalhe: `Asaas recusou o estorno: ${motivo}` };
  }
  const st = body?.status ?? '';
  if (st === 'REFUNDED') {
    return { status: 'estornado', detalhe: 'Estorno confirmado pelo Asaas.' };
  }
  return {
    status: 'estorno_em_andamento',
    detalhe: 'Estorno em processamento; a confirmacao chega pelo webhook. No cartao, pode levar ate 10 dias uteis na fatura.',
  };
}

// Eventos de webhook -> estado do pedido (somente avanca; nunca regride
// um pedido ja estornado/recusado).
export function estadoPedidoPorEvento(evento: string): StatusPedido | null {
  switch (evento) {
    case 'PAYMENT_REFUND_IN_PROGRESS':
      return 'estorno_em_andamento';
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_PARTIALLY_REFUNDED':
      return 'estornado';
    default:
      return null;
  }
}
