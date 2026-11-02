// Edge Function: formulario de Contato (logica em handler.ts). Chamada sem
// login (chave anon). Grava com service role; o navegador nunca escreve na tabela.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleContato } from './handler.ts';

serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  return handleContato(req, {
    contarRecentes: async (email, desde) => {
      const a = await db.from('contato_mensagens').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', desde);
      const b = await db.from('contato_mensagens').select('id', { count: 'exact', head: true }).gte('created_at', desde);
      return { porEmail: a.count ?? 0, total: b.count ?? 0 };
    },
    inserir: async (linha) => {
      const { error } = await db.from('contato_mensagens').insert(linha);
      return { ok: !error };
    },
  });
});
