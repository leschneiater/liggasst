// Edge Function: decisao de reembolso pela admin (analisa/aprova/recusa) com
// execucao do estorno no Asaas na aprovacao. NENHUM estorno acontece sem a
// acao humana da admin por pedido, com valor e cobranca confirmados na tela.
// SANDBOX somente neste pacote; sem roteamento de producao.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleReembolso } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const comCors = (res: Response): Response => {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
};

serve(async (req) => {
  // Preflight do navegador (a aba admin chama esta function de outra origem).
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return comCors(await tratar(req));
});

async function tratar(req: Request): Promise<Response> {
  // SANDBOX somente, fixo no codigo (mesma regra do asaas-webhook implantado).
  // Estorno real em producao exige outra decisao, fora deste pacote.
  const asaasEnv = {
    asaasApiKey: Deno.env.get('ASAAS_API_KEY') ?? '',
    asaasBase: 'https://api-sandbox.asaas.com/v3',
    environment: 'sandbox' as const,
  };
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) {
    return new Response(JSON.stringify({ error: 'nao autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (perfil?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'restrito a administracao' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return handleReembolso(req, {
    ...asaasEnv,
    createClient: () => supabase,
    fetchFn: fetch,
    adminId: user.id,
  });
}
