// Handler da Edge Function training-file-url, com dependencias injetadas
// para teste de integracao em vitest (sem Deno nem rede). Usa apenas a Fetch
// API padrao (Request/Response), disponivel em Deno e Node 18+.
import { decidirAcessoPdf } from './decide.ts';
import type { PerfilChamador, TreinamentoAlvo } from './decide.ts';

// Recorte minimo do cliente supabase-js usado aqui (sem `any`); o createClient
// real e os mocks de teste satisfazem esta interface estruturalmente.
export interface SupabaseClientMin {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => { single: () => Promise<{ data: unknown; error?: unknown }> };
    };
  };
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, ttl: number) => Promise<{ data: { signedUrl?: string } | null; error: unknown }>;
    };
  };
}

export interface Deps {
  supabaseUrl: string;
  serviceRoleKey: string;
  // Mesma assinatura do createClient do supabase-js usado no index.ts
  createClient: (url: string, key: string) => SupabaseClientMin;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TTL_SEGUNDOS = 300;

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const handleRequest = async (req: Request, deps: Deps): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'autenticacao necessaria' }, 401);

    let body: { training_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'training_id obrigatorio' }, 400);
    }
    const trainingId = body.training_id;
    if (!trainingId || typeof trainingId !== 'string') {
      return json({ error: 'training_id obrigatorio' }, 400);
    }

    const admin = deps.createClient(deps.supabaseUrl, deps.serviceRoleKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'autenticacao necessaria' }, 401);

    const { data: profile } = await admin
      .from('profiles')
      .select('role, verification_status, is_test')
      .eq('id', user.id)
      .single();

    const { data: training } = await admin
      .from('trainings')
      .select('audience, status, pdf_path, is_test')
      .eq('id', trainingId)
      .single();

    const decisao = decidirAcessoPdf(
      profile as PerfilChamador | null,
      training as TreinamentoAlvo | null,
    );
    if (!decisao.ok) return json({ error: decisao.erro }, decisao.status);

    const pdfPath = (training as TreinamentoAlvo).pdf_path;
    if (!pdfPath) return json({ error: 'arquivo indisponivel' }, 404);

    const { data, error } = await admin.storage
      .from('trainings')
      .createSignedUrl(pdfPath, TTL_SEGUNDOS);
    if (error || !data?.signedUrl) return json({ error: 'falha ao gerar link' }, 500);

    return json({ signedUrl: data.signedUrl, expiresIn: TTL_SEGUNDOS }, 200);
  } catch {
    return json({ error: 'erro interno' }, 500);
  }
};
