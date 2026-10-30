# shared-certificate-url (PREPARACAO — nao implantada)

Primeira Edge Function do projeto. Implantação exige autorizacao da dona e
acesso ao projeto Supabase (dashboard ou CLI com token — credencial na hora).

- Plano gratuito inclui Edge Functions (500 mil invocacoes/mes, 100 funcoes por
  projeto), sem conta nova. Fontes: supabase.com/docs/guides/functions/pricing
  e /limits (verificadas em 30/10/2026).
- Nenhum segredo novo no codigo: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao
  injetados pela plataforma. A service role key NUNCA vai ao cliente.
- verify_jwt padrao (true) exige JWT valido; a funcao ainda confere role=company
  e o flag visible_to_companies na hora de cada pedido.
