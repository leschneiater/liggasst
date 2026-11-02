// Teste da funcao asaas-reembolso REAL (handler + decide) com supabase e
// Asaas em memoria. Sem Deno, sem rede. Confirma: decisao so uma vez
// (transicao atomica), estorno nunca duplicado (consulta previa de refunds),
// valor confirmado na fonte, estados assincronos e erro do Asaas registrados.
import { describe, it, expect } from 'vitest';
import { handleReembolso } from '../../../supabase/functions/asaas-reembolso/handler';
import {
  validarTransicao,
  pagamentoEstornavel,
  estadoAposResposta,
  estadoPedidoPorEvento,
} from '../../../supabase/functions/asaas-reembolso/decide';

const PEDIDO = {
  id: 'ped-1',
  profile_id: 'user-1',
  asaas_payment_id: 'pay_123',
  valor: null,
  motivo: 'Cobranca indevida',
  status: 'pendente' as const,
  environment: 'sandbox',
  created_at: '2026-11-02T00:00:00Z',
};

function criarMemoria(pedidoInicial: Record<string, unknown> | null = PEDIDO) {
  const rows = new Map<string, Record<string, unknown>>();
  if (pedidoInicial) rows.set((pedidoInicial as any).id, { ...pedidoInicial });
  const tabela = {
    select: (_c?: string) => ({
      eq: (col: string, val: string) => ({
        maybeSingle: async () => ({
          data: [...rows.values()].find((r) => r[col] === val) ?? null,
          error: null,
        }),
      }),
      order: () => ({ then: undefined, data: [...rows.values()], error: null }),
      then: (resolve: any) => resolve({ data: [...rows.values()], error: null }),
    }),
    update: (patch: Record<string, unknown>) => {
      const filtros: [string, any][] = [];
      const ins: [string, any][] = [];
      const executor = {
        eq: (col: string, val: unknown) => { filtros.push([col, val]); return executor; },
        in: (col: string, vals: unknown[]) => { vals.forEach((v) => ins.push([col, v])); return executor; },
        select: async (_c?: string) => {
          const alvos = [...rows.values()].filter((r) =>
            filtros.every(([c, v]) => r[c as string] === v) &&
            (ins.length === 0 || ins.some(([c, v]) => r[c as string] === v)));
          alvos.forEach((r) => Object.assign(r, patch));
          return { data: alvos.map((r) => ({ id: r.id })), error: null };
        },
        then: (resolve: any) => {
          const alvos = [...rows.values()].filter((r) =>
            filtros.every(([c, v]) => r[c as string] === v) &&
            (ins.length === 0 || ins.some(([c, v]) => r[c as string] === v)));
          alvos.forEach((r) => Object.assign(r, patch));
          return resolve({ data: null, error: null });
        },
      };
      return executor;
    },
  };
  return { from: (_t: string) => tabela, rows };
}

interface Cenario {
  pedido?: Record<string, unknown> | null;
  pagamentoAsaas?: Record<string, unknown>;
  refundsExistentes?: unknown[];
  falhaRefund?: { status: number; body: unknown };
}

function mkDeps(c: Cenario = {}) {
  const memoria = criarMemoria(c.pedido === undefined ? PEDIDO : c.pedido);
  const chamados: { method: string; url: string; body: any }[] = [];
  const deps = {
    asaasApiKey: 'k',
    asaasBase: 'https://api-sandbox.asaas.com/v3',
    environment: 'sandbox' as const,
    createClient: () => memoria as never,
    adminId: 'admin-1',
    fetchFn: (async (url: string, init?: any) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(init.body) : null;
      chamados.push({ method, url, body });
      if (url.endsWith(`/payments/${PEDIDO.asaas_payment_id}/refunds`)) {
        return new Response(JSON.stringify({ data: c.refundsExistentes ?? [] }), { status: 200 });
      }
      if (url.endsWith(`/payments/${PEDIDO.asaas_payment_id}/refund`)) {
        if (c.falhaRefund) return new Response(JSON.stringify(c.falhaRefund.body), { status: c.falhaRefund.status });
        return new Response(JSON.stringify({ status: 'REFUND_IN_PROGRESS' }), { status: 200 });
      }
      if (url.endsWith(`/payments/${PEDIDO.asaas_payment_id}`)) {
        return new Response(JSON.stringify(c.pagamentoAsaas ?? { value: 99.9, status: 'RECEIVED', billingType: 'CREDIT_CARD' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as never,
  };
  return { deps, memoria, chamados };
}

function req(body: unknown): Request {
  return new Request('https://fn', { method: 'POST', body: JSON.stringify(body) });
}

describe('decide puro', () => {
  it('decisao so a partir de pendente (ou erro para nova tentativa de aprovacao)', () => {
    expect(validarTransicao('pendente', 'aprovar').ok).toBe(true);
    expect(validarTransicao('pendente', 'recusar').ok).toBe(true);
    expect(validarTransicao('aprovado', 'aprovar').ok).toBe(false);
    expect(validarTransicao('estornado', 'recusar').ok).toBe(false);
    expect(validarTransicao('erro', 'aprovar').ok).toBe(true);
    expect(validarTransicao('erro', 'recusar').ok).toBe(false);
  });
  it('cobranca estornavel so confirmada/recebida', () => {
    expect(pagamentoEstornavel('RECEIVED')).toBe(true);
    expect(pagamentoEstornavel('CONFIRMED')).toBe(true);
    expect(pagamentoEstornavel('REFUNDED')).toBe(false);
    expect(pagamentoEstornavel('PENDING')).toBe(false);
  });
  it('resposta do Asaas mapeia estados assincronos e erro', () => {
    expect(estadoAposResposta(true, { status: 'REFUNDED' }).status).toBe('estornado');
    expect(estadoAposResposta(true, { status: 'REFUND_IN_PROGRESS' }).status).toBe('estorno_em_andamento');
    const falha = estadoAposResposta(false, { errors: [{ description: 'Saldo insuficiente' }] });
    expect(falha.status).toBe('erro');
    expect(falha.detalhe).toContain('Saldo insuficiente');
  });
  it('eventos de webhook avancam o pedido', () => {
    expect(estadoPedidoPorEvento('PAYMENT_REFUND_IN_PROGRESS')).toBe('estorno_em_andamento');
    expect(estadoPedidoPorEvento('PAYMENT_REFUNDED')).toBe('estornado');
    expect(estadoPedidoPorEvento('PAYMENT_PARTIALLY_REFUNDED')).toBe('estornado');
    expect(estadoPedidoPorEvento('PAYMENT_RECEIVED')).toBeNull();
  });
});

describe('aprovar', () => {
  it('fluxo feliz: consulta refunds, confirma cobranca, estorna, marca em_andamento', async () => {
    const { deps, memoria, chamados } = mkDeps();
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.status).toBe('estorno_em_andamento');
    expect(memoria.rows.get('ped-1')?.status).toBe('estorno_em_andamento');
    expect(memoria.rows.get('ped-1')?.valor).toBe(99.9);
    expect(memoria.rows.get('ped-1')?.decided_by).toBe('admin-1');
    const urls = chamados.map((c) => `${c.method} ${c.url}`);
    expect(urls.some((u) => u.startsWith('GET') && u.endsWith('/refunds'))).toBe(true);
    expect(urls.some((u) => u.startsWith('POST') && u.endsWith('/refund'))).toBe(true);
    // nunca mostra "reembolsado" so por clicar: estado final vem do webhook
    expect(corpo.detalhe).toContain('processamento');
  });

  it('nunca duplica: refund ja existente no Asaas -> nao cria outro', async () => {
    const { deps, memoria, chamados } = mkDeps({ refundsExistentes: [{ id: 'ref_1' }] });
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(200);
    expect(memoria.rows.get('ped-1')?.status).toBe('estornado');
    expect(chamados.some((c) => c.method === 'POST' && c.url.endsWith('/refund'))).toBe(false);
  });

  it('pedido ja decidido nao reexecuta (409) e nao chama o Asaas', async () => {
    const { deps, chamados } = mkDeps({ pedido: { ...PEDIDO, status: 'estornado' } });
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(409);
    expect(chamados.length).toBe(0);
  });

  it('cobranca em estado nao estornavel -> erro, sem POST refund', async () => {
    const { deps, memoria, chamados } = mkDeps({ pagamentoAsaas: { value: 99.9, status: 'REFUNDED' } });
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(409);
    expect(memoria.rows.get('ped-1')?.status).toBe('erro');
    expect(chamados.some((c) => c.method === 'POST')).toBe(false);
  });

  it('recusa do Asaas (ex.: saldo insuficiente) vira erro com motivo, estorno nao confirmado', async () => {
    const { deps, memoria } = mkDeps({ falhaRefund: { status: 400, body: { errors: [{ description: 'Saldo insuficiente' }] } } });
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(502);
    expect(memoria.rows.get('ped-1')?.status).toBe('erro');
    expect(String(memoria.rows.get('ped-1')?.detalhe)).toContain('Saldo insuficiente');
  });

  it('pedido de outro ambiente nao e tocado', async () => {
    const { deps } = mkDeps({ pedido: { ...PEDIDO, environment: 'production' } });
    const r = await handleReembolso(req({ acao: 'aprovar', pedido_id: 'ped-1' }), deps);
    expect(r.status).toBe(409);
  });
});

describe('recusar', () => {
  it('recusa exige motivo e registra decisao', async () => {
    const { deps, memoria } = mkDeps();
    const r = await handleReembolso(req({ acao: 'recusar', pedido_id: 'ped-1', detalhe: 'Fora do prazo legal' }), deps);
    expect(r.status).toBe(200);
    expect(memoria.rows.get('ped-1')?.status).toBe('recusado');
    expect(memoria.rows.get('ped-1')?.detalhe).toBe('Fora do prazo legal');
  });
  it('recusa sem motivo falha', async () => {
    const { deps } = mkDeps();
    const r = await handleReembolso(req({ acao: 'recusar', pedido_id: 'ped-1', detalhe: ' ' }), deps);
    expect(r.status).toBe(400);
  });
  it('recusar pedido ja estornado nao regride', async () => {
    const { deps, memoria } = mkDeps({ pedido: { ...PEDIDO, status: 'estornado' } });
    const r = await handleReembolso(req({ acao: 'recusar', pedido_id: 'ped-1', detalhe: 'x' }), deps);
    expect(r.status).toBe(409);
    expect(memoria.rows.get('ped-1')?.status).toBe('estornado');
  });
});
