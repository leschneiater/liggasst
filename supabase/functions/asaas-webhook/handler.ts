// Handler da Edge Function asaas-webhook, com dependencias injetadas para
// teste de integracao em vitest (sem Deno nem rede). Usa apenas a Fetch API
// padrao (Request/Response), disponivel em Deno e Node 18+.
//
// Fluxo: valida token -> registra o evento (idempotencia) -> confirma o
// pagamento na API do Asaas (nunca confia so no payload) -> acha o dono pelo
// externalReference -> decide a transicao (decide.ts) -> aplica no banco.
// O que so se confirma apos implantacao: runtime Deno, secrets e rede.
import { decidirEvento, PLANO_INICIAL } from './decide.ts';
import { estadoPedidoPorEvento } from './reembolso-decide.ts';
import type { EstadoPlano, EventoAsaas } from './decide.ts';

interface ErroMin { code?: string; message?: string }

// Recorte minimo do supabase-js usado aqui; o createClient real e os mocks
// de teste satisfazem esta interface estruturalmente.
export interface SupabaseClientMin {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: ErroMin | null }>;
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: ErroMin | null }>;
      };
    };
    upsert: (row: Record<string, unknown>) => Promise<{ error: ErroMin | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => {
        eq: (col2: string, value2: string) => {
          in: (col3: string, values: unknown[]) => Promise<{ error: ErroMin | null }>;
        } & Promise<{ error: ErroMin | null }>;
      } & Promise<{ error: ErroMin | null }>;
    };
  };
}

export interface Deps {
  webhookToken: string;
  paidPlan: string; // nome do plano pago de testes (decisao final da dona)
  asaasApiKey: string;
  asaasBase: string; // https://api-sandbox.asaas.com/v3 nos testes
  environment: 'sandbox' | 'production';
  createClient: () => SupabaseClientMin;
  fetchFn: typeof fetch;
  // CONTENCAO D1: eventos de contas fora da lista de testes sao registrados
  // (auditoria) mas NUNCA aplicados.
  allowedProfiles: string[];
}

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const handleRequest = async (req: Request, deps: Deps): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // 1. Isolamento por ambiente: cada ambiente tem seu proprio token.
  if (req.headers.get('asaas-access-token') !== deps.webhookToken) {
    return json({ error: 'unauthorized' }, 401);
  }

  let event: EventoAsaas;
  try {
    event = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const supabase = deps.createClient();

  // 2. Idempotencia + auditoria: registra antes de aplicar; repetido nao reaplica.
  const eventKey = event.id ?? `${event.event}:${event.payment?.id ?? event.subscription?.id ?? 'sem-id'}`;
  const { error: erroInsert } = await supabase.from('asaas_webhook_events').insert({
    event_key: eventKey,
    event_type: event.event,
    payload: event as unknown as Record<string, unknown>,
    environment: deps.environment,
  });
  if (erroInsert?.code === '23505') return json({ duplicado: true }, 200);
  if (erroInsert) return json({ error: 'falha ao registrar evento' }, 500);

  const marcarAplicado = async (applied: boolean) => {
    await supabase.from('asaas_webhook_events').update({ applied }).eq('event_key', eventKey);
  };

  // 3. Confirmar o pagamento no Asaas: o payload nao basta como prova.
  let payment = event.payment ?? {};
  if (payment.id) {
    try {
      const r = await deps.fetchFn(`${deps.asaasBase}/payments/${payment.id}`, {
        headers: { access_token: deps.asaasApiKey },
      });
      if (!r.ok) {
        await marcarAplicado(false);
        return json({ error: 'asaas nao confirmou o pagamento' }, 502);
      }
      payment = await r.json();
    } catch {
      await marcarAplicado(false);
      return json({ error: 'falha ao consultar o asaas' }, 502);
    }
  }
  const eventoConfirmado: EventoAsaas = { ...event, payment };

  // 4b. Pedidos de reembolso (aba admin): eventos de estorno atualizam o
  // pedido pelo id da cobranca, no mesmo ambiente. Independente da decisao
  // de plano abaixo (que pode ignorar o evento). Nunca regride estado:
  // so avanca pedidos ainda em aprovado/estorno_em_andamento.
  const novoStatusPedido = estadoPedidoPorEvento(event.event);
  if (novoStatusPedido && payment.id) {
    await supabase.from('reembolso_pedidos')
      .update({ status: novoStatusPedido })
      .eq('asaas_payment_id', payment.id)
      .eq('environment', deps.environment)
      .in('status', ['aprovado', 'estorno_em_andamento']);
  }

  // 4. Dono no Ligga: externalReference gravado na criacao do checkout.
  //    Eventos de ASSINATURA podem vir sem externalReference no payload
  //    (observado em 01/11: SUBSCRIPTION_CREATED sem ref). Ignorar esses
  //    eventos no atacado deixaria cancelamentos falharem, entao resolvemos
  //    o dono no servidor, nesta ordem, tudo verificavel:
  //    a) nossa tabela subscriptions por asaas_subscription_id;
  //    b) o objeto remoto no Asaas (subscription -> externalReference);
  //    c) o customer remoto (externalReference = profileId, gravado na
  //       criacao do cliente). A allowlist abaixo continua valendo para o
  //    profileId RESOLVIDO — a resolucao nao contorna o gate.
  let profileId = payment.externalReference ?? event.subscription?.externalReference ?? null;
  const subIdEvento = payment.subscription ?? event.subscription?.id ?? null;
  if (!profileId && subIdEvento) {
    const { data: vinculo } = await supabase
      .from('subscriptions')
      .select('profile_id')
      .eq('asaas_subscription_id', subIdEvento)
      .maybeSingle();
    profileId = (vinculo as { profile_id?: string } | null)?.profile_id ?? null;
  }
  if (!profileId && subIdEvento) {
    try {
      const r = await deps.fetchFn(`${deps.asaasBase}/subscriptions/${subIdEvento}`, {
        headers: { access_token: deps.asaasApiKey },
      });
      if (r.ok) {
        const remota = await r.json();
        profileId = remota?.externalReference ?? null;
        if (!profileId && remota?.customer) {
          const rc = await deps.fetchFn(`${deps.asaasBase}/customers/${remota.customer}`, {
            headers: { access_token: deps.asaasApiKey },
          });
          if (rc.ok) profileId = (await rc.json())?.externalReference ?? null;
        }
      }
    } catch {
      // sem resolucao remota: cai no ignorado abaixo
    }
  }
  if (!profileId || typeof profileId !== 'string') {
    await marcarAplicado(false);
    return json({ ignorado: 'sem externalReference nem resolucao servidor' }, 202);
  }
  if (!deps.allowedProfiles.includes(profileId)) {
    await marcarAplicado(false);
    return json({ ignorado: 'profile fora da lista de testes' }, 202);
  }

  // 5. Estado atual e decisao pura.
  const { data } = await supabase.from('subscriptions').select('*').eq('profile_id', profileId).maybeSingle();
  const atual: EstadoPlano = {
    ...PLANO_INICIAL,
    ...(data as Partial<EstadoPlano> | null),
  };
  const decisao = decidirEvento(eventoConfirmado, atual, deps.paidPlan);
  if (decisao.acao === 'ignorar') {
    await marcarAplicado(false);
    return json({ ignorado: decisao.motivo }, 202);
  }

  // 6. Aplicar: periodo pago/estornado e estado da assinatura.
  if (decisao.periodo) {
    await supabase.from('subscription_payments').upsert({
      ...decisao.periodo,
      profile_id: profileId,
      asaas_subscription_id: decisao.patch.asaas_subscription_id,
      environment: deps.environment,
    });
  }
  if (decisao.pagamentoEstornado) {
    await supabase.from('subscription_payments')
      .update({ status: decisao.pagamentoEstornado.status })
      .eq('asaas_payment_id', decisao.pagamentoEstornado.id);
  }
  await supabase.from('subscriptions').upsert({
    ...atual,
    ...decisao.patch,
    profile_id: profileId,
    environment: deps.environment,
    updated_at: new Date().toISOString(),
  });
  await marcarAplicado(true);
  return json({ ok: true }, 200);
};
