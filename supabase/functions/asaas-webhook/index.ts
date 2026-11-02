// Edge Function: webhook do Asaas (versao de testes, SANDBOX somente).
// A logica vive em handler.ts + decide.ts (testadas em vitest); este arquivo
// e so o adaptador Deno. Segredos via env da funcao (nunca no codigo):
//   ASAAS_API_KEY        -> chave de TESTES do sandbox (cofre, nunca chat)
//   ASAAS_WEBHOOK_TOKEN  -> token de validacao do webhook (por ambiente)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -> ja disponiveis na Edge Function
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleRequest } from './handler.ts';

serve((req) =>
  handleRequest(req, {
    webhookToken: Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '',
    // Teste com um plano pago so; o nome usa o plano profissional da migracao.
    // Quais planos existem de verdade (e precos) e decisao da dona do produto.
    paidPlan: 'pro_professional',
    asaasApiKey: Deno.env.get('ASAAS_API_KEY') ?? '',
    asaasBase: 'https://api-sandbox.asaas.com/v3', // sandbox somente
    environment: 'sandbox',
    createClient: () =>
      createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      ),
    fetchFn: fetch,
    allowedProfiles: (Deno.env.get('ALLOWED_TEST_PROFILES') ?? '')
      .split(',').map((v: string) => v.trim()).filter(Boolean),
  })
);

