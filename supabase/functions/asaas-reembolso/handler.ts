// Handler da decisao de reembolso (admin). IO injetado para teste sem rede.
// Camadas anti-dupla-devolucao:
// 1) transicao atomica no banco (status pendente/erro -> aprovado/recusado);
// 2) consulta de estornos existentes no Asaas ANTES de criar outro;
// 3) indice unico por cobranca na migration.
import {
  validarTransicao,
  pagamentoEstornavel,
  estadoAposResposta,
  type StatusPedido,
} from './decide.ts';

interface PedidoRow {
  id: string;
  profile_id: string;
  asaas_payment_id: string;
  valor: number | null;
  motivo: string;
  status: StatusPedido;
  environment: string;
  created_at: string;
}

export interface ReembolsoDeps {
  asaasApiKey: string;
  asaasBase: string;
  environment: 'sandbox' | 'production';
  createClient: () => any;
  fetchFn: typeof fetch;
  // admin ja verificado no index.ts (JWT + role); aqui so o id para auditoria
  adminId: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function asaasGet(deps: ReembolsoDeps, path: string): Promise<{ ok: boolean; body: any }> {
  const r = await deps.fetchFn(`${deps.asaasBase}${path}`, {
    headers: { access_token: deps.asaasApiKey },
  });
  return { ok: r.ok, body: await r.json().catch(() => null) };
}

async function asaasPost(deps: ReembolsoDeps, path: string, body: unknown): Promise<{ ok: boolean; body: any }> {
  const r = await deps.fetchFn(`${deps.asaasBase}${path}`, {
    method: 'POST',
    headers: { access_token: deps.asaasApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, body: await r.json().catch(() => null) };
}

// Claim atomico: muda o status somente se ainda estiver no estado esperado.
// Retorna true se ESTA chamada ganhou a transicao (duplo clique perde).
async function claim(
  deps: ReembolsoDeps,
  pedidoId: string,
  de: StatusPedido[],
  para: StatusPedido,
  extra: Record<string, unknown>,
): Promise<boolean> {
  const supabase = deps.createClient();
  const { data } = await supabase
    .from('reembolso_pedidos')
    .update({ status: para, ...extra })
    .eq('id', pedidoId)
    .in('status', de)
    .select('id');
  return Array.isArray(data) && data.length === 1;
}

async function finalizar(
  deps: ReembolsoDeps,
  pedidoId: string,
  status: StatusPedido,
  detalhe: string,
  valor?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status, detalhe };
  if (valor !== undefined) patch.valor = valor;
  await deps.createClient().from('reembolso_pedidos').update(patch).eq('id', pedidoId);
}

async function buscarPedido(deps: ReembolsoDeps, id: string): Promise<PedidoRow | null> {
  const { data } = await deps.createClient()
    .from('reembolso_pedidos')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as PedidoRow | null) ?? null;
}

async function listar(deps: ReembolsoDeps): Promise<Response> {
  const { data, error } = await deps.createClient()
    .from('reembolso_pedidos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return json({ error: 'falha ao listar pedidos' }, 500);
  const pedidos = (data ?? []) as PedidoRow[];
  // Enriquecimento com o valor REAL da cobranca no Asaas (fonte da verdade),
  // para a decisao acontecer com valor e cobranca claros na tela.
  const enriquecidos = [] as unknown[];
  for (const p of pedidos) {
    let pagamento: Record<string, unknown> | null = null;
    try {
      const r = await asaasGet(deps, `/payments/${p.asaas_payment_id}`);
      if (r.ok && r.body) {
        pagamento = {
          valor: r.body.value ?? null,
          status: r.body.status ?? null,
          billingType: r.body.billingType ?? null,
          paymentDate: r.body.paymentDate ?? r.body.confirmedDate ?? null,
        };
      }
    } catch { /* enriquecimento e best-effort */ }
    enriquecidos.push({ ...p, pagamento });
  }
  return json({ pedidos: enriquecidos });
}

async function aprovar(deps: ReembolsoDeps, pedidoId: string): Promise<Response> {
  const pedido = await buscarPedido(deps, pedidoId);
  if (!pedido) return json({ error: 'pedido nao encontrado' }, 404);
  if (pedido.environment !== deps.environment) {
    return json({ error: `pedido e de outro ambiente (${pedido.environment})` }, 409);
  }
  const v = validarTransicao(pedido.status, 'aprovar');
  if (!v.ok) return json({ error: v.erro }, 409);

  // 1) claim atomico: so uma execucao passa daqui
  const ganhou = await claim(deps, pedidoId, ['pendente', 'erro'], 'aprovado', {
    decided_by: deps.adminId,
    decided_at: new Date().toISOString(),
  });
  if (!ganhou) return json({ error: 'pedido ja decidido por outra execucao' }, 409);

  // 2) anti-dupla: consulta estornos existentes no Asaas antes de criar outro
  const existentes = await asaasGet(deps, `/payments/${pedido.asaas_payment_id}/refunds`);
  const lista = existentes.ok ? (existentes.body?.data ?? []) : [];
  if (Array.isArray(lista) && lista.length > 0) {
    await finalizar(deps, pedidoId, 'estornado', 'Ja existia estorno registrado no Asaas; nenhum novo estorno foi criado.');
    return json({ status: 'estornado', detalhe: 'Ja existia estorno registrado no Asaas; nenhum novo estorno foi criado.' });
  }

  // 3) confirma valor e estado reais da cobranca na fonte (Asaas)
  const pag = await asaasGet(deps, `/payments/${pedido.asaas_payment_id}`);
  if (!pag.ok || !pag.body) {
    await finalizar(deps, pedidoId, 'erro', 'Nao foi possivel confirmar a cobranca no Asaas; nenhum estorno foi criado.');
    return json({ status: 'erro', detalhe: 'Nao foi possivel confirmar a cobranca no Asaas; nenhum estorno foi criado.' }, 502);
  }
  if (!pagamentoEstornavel(String(pag.body.status ?? ''))) {
    const det = `Cobranca em estado ${pag.body.status}; estorno nao permitido pelo Asaas.`;
    await finalizar(deps, pedidoId, 'erro', det);
    return json({ status: 'erro', detalhe: det }, 409);
  }
  const valor = typeof pag.body.value === 'number' ? pag.body.value : undefined;

  // 4) estorno integral com motivo registrado
  const resp = await asaasPost(deps, `/payments/${pedido.asaas_payment_id}/refund`, {
    description: pedido.motivo.slice(0, 500),
  });
  const fim = estadoAposResposta(resp.ok, resp.body);
  await finalizar(deps, pedidoId, fim.status, fim.detalhe, valor);
  return json({ status: fim.status, detalhe: fim.detalhe, valor }, fim.status === 'erro' ? 502 : 200);
}

async function recusar(deps: ReembolsoDeps, pedidoId: string, detalhe: string): Promise<Response> {
  if (!detalhe.trim()) return json({ error: 'motivo da recusa obrigatorio' }, 400);
  const pedido = await buscarPedido(deps, pedidoId);
  if (!pedido) return json({ error: 'pedido nao encontrado' }, 404);
  const v = validarTransicao(pedido.status, 'recusar');
  if (!v.ok) return json({ error: v.erro }, 409);
  const ganhou = await claim(deps, pedidoId, ['pendente'], 'recusado', {
    decided_by: deps.adminId,
    decided_at: new Date().toISOString(),
    detalhe,
  });
  if (!ganhou) return json({ error: 'pedido ja decidido por outra execucao' }, 409);
  return json({ status: 'recusado', detalhe });
}

export async function handleReembolso(req: Request, deps: ReembolsoDeps): Promise<Response> {
  let body: { acao?: string; pedido_id?: string; detalhe?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'corpo invalido' }, 400);
  }
  switch (body.acao) {
    case 'listar':
      return listar(deps);
    case 'aprovar':
      if (!body.pedido_id) return json({ error: 'pedido_id obrigatorio' }, 400);
      return aprovar(deps, body.pedido_id);
    case 'recusar':
      if (!body.pedido_id) return json({ error: 'pedido_id obrigatorio' }, 400);
      return recusar(deps, body.pedido_id, body.detalhe ?? '');
    default:
      return json({ error: 'acao desconhecida' }, 400);
  }
}
