// Edge Function: URL assinada curta (5 min) para o PDF de um treinamento.
// A logica vive em handler.ts (testada em vitest); este arquivo e so o
// adaptador Deno. Revogar/despublicar bloqueia novas URLs imediatamente;
// URLs ja emitidas valem ate expirar (<= 5 min) — URL assinada nao e DRM.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleRequest } from './handler.ts';

serve((req) =>
  handleRequest(req, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    createClient,
  })
);
