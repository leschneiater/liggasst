// PREPARACAO LOCAL — nao implantada. Primeira Edge Function do projeto.
// Gera URL assinada curta (5 min) para o arquivo de um certificado que o dono
// escolheu mostrar. Somente contas empresa autenticadas. Revogar o flag bloqueia
// novas URLs imediatamente; URLs ja emitidas valem ate expirar (<= 5 min).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'autenticacao necessaria' }, 401);

    const { certificate_id: certificateId } = await req.json();
    if (!certificateId || typeof certificateId !== 'string') {
      return json({ error: 'certificate_id obrigatorio' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'autenticacao necessaria' }, 401);

    const { data: profile } = await admin
      .from('profiles')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'company' || profile?.verification_status !== 'approved') {
      return json({ error: 'acesso restrito a empresas aprovadas' }, 403);
    }

    const { data: cert } = await admin
      .from('certificates')
      .select('professional_id, storage_path, visible_to_companies')
      .eq('id', certificateId)
      .single();
    if (!cert || !cert.visible_to_companies) {
      return json({ error: 'certificado nao compartilhado' }, 404);
    }

    // defesa em profundidade: mesmo que o dono edite storage_path (grant de
    // coluna existe), a funcao recusa caminhos fora da pasta do proprio
    // profissional — impede apontar para arquivo de outro usuario
    if (!cert.storage_path.startsWith(`${cert.professional_id}/`)) {
      return json({ error: 'certificado nao compartilhado' }, 404);
    }

    // profissional precisa estar aprovado (mesmo padrao da busca/perfil)
    const { data: donoProfile } = await admin
      .from('profiles')
      .select('role, verification_status')
      .eq('id', cert.professional_id)
      .single();
    if (donoProfile?.role !== 'professional' || donoProfile?.verification_status !== 'approved') {
      return json({ error: 'certificado nao compartilhado' }, 404);
    }

    const { data, error } = await admin.storage
      .from('documents')
      .createSignedUrl(cert.storage_path, TTL_SEGUNDOS);
    if (error || !data?.signedUrl) return json({ error: 'falha ao gerar link' }, 500);

    return json({ signedUrl: data.signedUrl, expiresIn: TTL_SEGUNDOS }, 200);
  } catch {
    return json({ error: 'requisicao invalida' }, 400);
  }
});
