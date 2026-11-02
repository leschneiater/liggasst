// Teste de integracao do handler REAL da Edge Function asaas-webhook
// (handler.ts + decide.ts), com supabase e Asaas simulados em memoria.
// Sem Deno, sem rede, sem banco de producao.
// O que so se confirma apos implantacao: runtime Deno, secrets, rede e o
// comportamento real do PostgREST/RLS (a migration tem teste proprio em
// supabase/tests/assinatura_policy.test.mjs, com Postgres embarcado).
import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../../../supabase/functions/asaas-webhook/handler';

// ---- supabase em memoria com a semantica real das operacoes usadas ----
type Row = Record<string, any>;
function criarSupabaseMemoria() {
  const tabelas: Record<string, { pk: string; rows: Map<string, Row> }> = {
    asaas_webhook_events: { pk: 'event_key', rows: new Map() },
    subscriptions: { pk: 'profile_id', rows: new Map() },
    subscription_payments: { pk: 'asaas_payment_id', rows: new Map() },
    reembolso_pedidos: { pk: 'id', rows: new Map() },
  };
  const from = (t: string) => {
    const tab = tabelas[t];
    return {
      insert: async (row: Row) =>
        tab.rows.has(row[tab.pk])
          ? { error: { code: '23505', message: 'duplicate key' } }
          : (tab.rows.set(row[tab.pk], { ...row }), { error: null }),
      select: () => ({
        eq: (col: string, val: string) => ({
          maybeSingle: async () => ({
            data: [...tab.rows.values()].find((r) => r[col] === val) ?? null,
            error: null,
          }),
        }),
      }),
      upsert: async (row: Row) => (tab.rows.set(row[tab.pk], { ...tab.rows.get(row[tab.pk]), ...row }), { error: null }),
      update: (row: Row) => {
        // cadeia de filtros eq().eq().in() como o PostgREST real
        const filtros: [string, unknown][] = [];
        const listas: [string, unknown[]][] = [];
        const aplicar = () => {
          for (const [k, r] of tab.rows) {
            const okEq = filtros.every(([c, v]) => r[c] === v);
            const okIn = listas.every(([c, vs]) => vs.includes(r[c]));
            if (okEq && okIn) tab.rows.set(k, { ...r, ...row });
          }
          return { error: null };
        };
        const exec: any = {
          eq: (col: string, val: string) => { filtros.push([col, val]); return exec; },
          in: (col: string, vals: unknown[]) => { listas.push([col, vals]); return exec; },
          then: (resolve: (v: unknown) => void) => resolve(aplicar()),
        };
        return exec;
      },
    };
  };
  return { from, tabelas };
}

const CONTA = 'user-ligga-123';
const pagamentoAsaas = (over: Row = {}): Row => ({
  id: 'pay_1',
  subscription: 'sub_1',
  externalReference: CONTA,
  dueDate: '2026-11-02',
  status: 'CONFIRMED',
  value: 39.9,
  ...over,
});

function mkDeps(opts: { falharAsaas?: boolean } = {}) {
  const memoria = criarSupabaseMemoria();
  // O Asaas real devolve o MESMO pagamento do evento; o mock espelha isso.
  const pagamentos: Record<string, Row> = {};
  const deps = {
    webhookToken: 'token-teste',
    paidPlan: 'pro_professional',
    asaasApiKey: 'chave-teste',
    asaasBase: 'https://api-sandbox.asaas.com/v3',
    environment: 'sandbox' as const,
    createClient: () => memoria,
    allowedProfiles: [CONTA],
    fetchFn: (async (_url: string, _init?: unknown) => {
      if (opts.falharAsaas) return new Response('erro', { status: 500 });
      const id = _url.split('/').pop() as string;
      return new Response(JSON.stringify(pagamentos[id] ?? pagamentoAsaas({ id })), { status: 200 });
    }) as typeof fetch,
  };
  const conta = (): Row => {
    const c = memoria.tabelas.subscriptions.rows.get(CONTA);
    if (!c) throw new Error('conta ausente no cenario');
    return c;
  };
  const enviar = (body: any, token = 'token-teste') => {
    if (body?.payment?.id) pagamentos[body.payment.id] = { ...body.payment };
    return handleRequest(req(body, token), deps);
  };
  return { deps, memoria, conta, enviar };
}

const req = (body: unknown, token = 'token-teste') =>
  new Request('https://fn.example/asaas-webhook', {
    method: 'POST',
    headers: { 'asaas-access-token': token },
    body: JSON.stringify(body),
  });

describe('handler asaas-webhook (integracao com deps simuladas)', () => {
  it('CONTENCAO: evento de profile fora da allowlist e registrado mas nao aplicado', async () => {
    const ctx = mkDeps();
    const r = await ctx.enviar({ id: 'ev_fora', event: 'PAYMENT_RECEIVED', payment: pagamentoAsaas({ id: 'pay_fora', externalReference: 'outro-user' }) });
    expect(r.status).toBe(202);
    const ev = ctx.memoria.tabelas.asaas_webhook_events.rows.get('ev_fora');
    expect(ev?.applied).toBe(false);
    expect(ctx.memoria.tabelas.subscriptions.rows.get('outro-user')).toBeUndefined();
  });

  let ctx: ReturnType<typeof mkDeps>;
  beforeEach(() => { ctx = mkDeps(); });

  it('rejeita metodo errado', async () => {
    const r = await handleRequest(new Request('https://fn.example', { method: 'GET' }), ctx.deps);
    expect(r.status).toBe(405);
  });

  it('rejeita token errado (isolamento por ambiente)', async () => {
    const r = await ctx.enviar({ id: 'e0', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() }, 'errado');
    expect(r.status).toBe(401);
  });

  it('SUBSCRIPTION_CREATED registra pendente sem pagar', async () => {
    await ctx.enviar({ id: 'e1', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_1', externalReference: CONTA } });
    expect(ctx.conta().status).toBe('pending_first_payment');
    expect(ctx.conta().plan).toBe('free');
  });

  it('primeiro pagamento ativa plano pago', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    expect(ctx.conta().plan).toBe('pro_professional');
    expect(ctx.conta().status).toBe('active');
    expect(ctx.conta().current_period_end).toBe('2026-12-02');
    expect(ctx.conta().last_paid_payment_id).toBe('pay_1');
  });

  it('evento repetido nao reaplica (idempotencia)', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    const r = await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    expect(await r.json()).toEqual({ duplicado: true });
    expect(ctx.conta().current_period_end).toBe('2026-12-02');
  });

  it('renovacao estende o periodo', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e3', event: 'PAYMENT_RECEIVED', payment: pagamentoAsaas({ id: 'pay_2', dueDate: '2026-12-02' }) });
    expect(ctx.conta().current_period_end).toBe('2027-01-02');
    expect(ctx.conta().last_paid_payment_id).toBe('pay_2');
  });

  it('evento fora de ordem nao regride o periodo', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e3', event: 'PAYMENT_RECEIVED', payment: pagamentoAsaas({ id: 'pay_2', dueDate: '2026-12-02' }) });
    await ctx.enviar({ id: 'e3b', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas({ id: 'pay_0', dueDate: '2026-10-02' }) });
    expect(ctx.conta().current_period_end).toBe('2027-01-02');
    expect(ctx.conta().status).toBe('active');
  });

  it('atraso marca past_due mantendo plano pago', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e4', event: 'PAYMENT_OVERDUE', payment: pagamentoAsaas({ id: 'pay_3' }) });
    expect(ctx.conta().status).toBe('past_due');
    expect(ctx.conta().plan).toBe('pro_professional');
  });

  it('estorno de pagamento ANTIGO nao derruba o periodo corrente', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e3', event: 'PAYMENT_RECEIVED', payment: pagamentoAsaas({ id: 'pay_2', dueDate: '2026-12-02' }) });
    await ctx.enviar({ id: 'e5', event: 'PAYMENT_REFUNDED', payment: pagamentoAsaas({ id: 'pay_1' }) });
    expect(ctx.conta().plan).toBe('pro_professional');
    expect(ctx.conta().current_period_end).toBe('2027-01-02');
    expect(ctx.memoria.tabelas.subscription_payments.rows.get('pay_1')?.status).toBe('refunded');
  });

  it('estorno do pagamento do periodo CORRENTE revoga na hora', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e3', event: 'PAYMENT_RECEIVED', payment: pagamentoAsaas({ id: 'pay_2', dueDate: '2026-12-02' }) });
    await ctx.enviar({ id: 'e6', event: 'PAYMENT_REFUNDED', payment: pagamentoAsaas({ id: 'pay_2' }) });
    expect(ctx.conta().plan).toBe('free');
    expect(ctx.conta().status).toBe('refunded');
    expect(ctx.conta().current_period_end).toBeNull();
  });

  it('cancelamento MANTEM pago ate o fim do periodo (default conservador)', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e8', event: 'SUBSCRIPTION_DELETED', subscription: { id: 'sub_1', externalReference: CONTA } });
    expect(ctx.conta().plan).toBe('pro_professional');
    expect(ctx.conta().status).toBe('canceled');
    expect(ctx.conta().current_period_end).toBe('2026-12-02');
  });

  it('chargeback do periodo corrente revoga na hora', async () => {
    await ctx.enviar({ id: 'e2', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    await ctx.enviar({ id: 'e9', event: 'PAYMENT_CHARGEBACK_REQUESTED', payment: pagamentoAsaas() });
    expect(ctx.conta().plan).toBe('free');
    expect(ctx.conta().status).toBe('chargeback');
  });

  it('evento sem ref no payload mas com resolucao servidor e aplicado', async () => {
    // mock padrao: /subscriptions/sub_1 responde objeto com externalReference=CONTA
    const r = await ctx.enviar({ id: 'e10', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_x', subscription: 'sub_1', dueDate: '2026-11-02' } });
    expect(r.status).toBe(200);
    expect(ctx.memoria.tabelas.subscriptions.rows.get(CONTA)?.status).toBe('active');
  });

  it('evento sem ref e irresoluvel no servidor nao altera estado', async () => {
    ctx.deps.fetchFn = (async (url: string) => {
      if (url.includes('/payments/')) return new Response(JSON.stringify({ id: 'pay_y', subscription: 'sub_z', dueDate: '2026-11-02' }), { status: 200 });
      return new Response(JSON.stringify({ id: 'sub_z' }), { status: 200 });
    }) as typeof fetch;
    const r = await handleRequest(req({ id: 'e10b', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_y', subscription: 'sub_z', dueDate: '2026-11-02' } }), ctx.deps);
    expect(r.status).toBe(202);
    expect(ctx.memoria.tabelas.subscriptions.rows.size).toBe(0);
  });

  it('falha na confirmacao do Asaas nao aplica o evento', async () => {
    ctx = mkDeps({ falharAsaas: true });
    const r = await ctx.enviar({ id: 'e11', event: 'PAYMENT_CONFIRMED', payment: pagamentoAsaas() });
    expect(r.status).toBe(502);
    expect(ctx.memoria.tabelas.subscriptions.rows.size).toBe(0);
    expect(ctx.memoria.tabelas.asaas_webhook_events.rows.get('e11')?.applied).toBe(false);
  });

  it('evento de assinatura sem externalReference resolve o dono pelo vinculo local', async () => {
    const ctx2 = mkDeps();
    ctx2.memoria.tabelas.subscriptions.rows.set(CONTA, { profile_id: CONTA, asaas_subscription_id: 'sub_1', plan: 'free', status: 'none' });
    const r = await handleRequest(req({ id: 'ev_subsemref', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_1' } }), ctx2.deps);
    expect(r.status).toBe(200);
    expect(ctx2.memoria.tabelas.asaas_webhook_events.rows.get('ev_subsemref')?.applied).toBe(true);
    expect(ctx2.memoria.tabelas.subscriptions.rows.get(CONTA)?.status).toBe('pending_first_payment');
  });

  it('evento de assinatura sem ref e sem vinculo local resolve no Asaas remoto', async () => {
    const ctx2 = mkDeps();
    // o fetchFn padrao devolve objeto com externalReference=CONTA para /subscriptions/sub_9
    const r = await handleRequest(req({ id: 'ev_subremota', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_9' } }), ctx2.deps);
    expect(r.status).toBe(200);
    expect(ctx2.memoria.tabelas.subscriptions.rows.get(CONTA)?.status).toBe('pending_first_payment');
  });

  it('sem ref e sem resolucao no servidor: registrado, ignorado, nada aplicado', async () => {
    const ctx2 = mkDeps();
    ctx2.deps.fetchFn = (async () => new Response(JSON.stringify({ id: 'sub_x' }), { status: 200 })) as typeof fetch;
    const r = await handleRequest(req({ id: 'ev_semres', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_x' } }), ctx2.deps);
    expect(r.status).toBe(202);
    expect(ctx2.memoria.tabelas.asaas_webhook_events.rows.get('ev_semres')?.applied).toBe(false);
    expect(ctx2.memoria.tabelas.subscriptions.rows.size).toBe(0);
  });

  it('resolucao remota nao contorna a allowlist', async () => {
    const ctx2 = mkDeps();
    ctx2.deps.fetchFn = (async () => new Response(JSON.stringify({ id: 'sub_y', externalReference: 'outro-user' }), { status: 200 })) as typeof fetch;
    const r = await handleRequest(req({ id: 'ev_gate', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_y' } }), ctx2.deps);
    expect(r.status).toBe(202);
    expect(ctx2.memoria.tabelas.subscriptions.rows.get('outro-user')).toBeUndefined();
  });
});
