# Estado de aplicação em produção (projeto ilvrcozeqbdgeuzjgpvf)

Registro operacional para reconciliar aplicações manuais (SQL editor) com o
histórico de migrations, evitando reaplicação indevida quando a publicação
oficial (ex.: `supabase db push`) for aprovada.

## Aplicadas em produção

- `20261030150000_busca_profissional_exclui_admin.sql` — APLICADA MANUALMENTE
  via SQL editor em 30/10/2026 ~12:04 (-03), com aprovação explícita da
  usuária ("pode corrigir", 30/10/2026 12:03:16, WhatsApp
  wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYFjNFQjA0MEEzRTEwQjdCQkNENkY1QTAA). Verificado após
  aplicação: conta admin fora da busca e do perfil público por ID; registro
  em `professionals` preservado.
- `20261030090000_get_professional_public.sql` — a função existe em produção
  (confirmado por consulta a pg_proc em 30/10/2026); a forma de aplicação
  não está registrada neste arquivo.
- Migrations anteriores a 30/10/2026 (até `20261029230001`) seguem o estado
  anterior a este registro.

## NÃO aplicadas em produção (aguardando aprovação de publicação)

- `20261030120000_get_profile_public.sql`
- `20261030130000_mensagens_inicio_papeis.sql`
- `20261030140000_bloqueio_denuncia.sql`

## Reconciliação na publicação futura

A aplicação manual via SQL editor NÃO registra a versão em
`supabase_migrations.schema_migrations`. Antes de um `supabase db push`:

1. `supabase migration repair 20261030150000 --status applied` (e conferir o
   status de `20261030090000`), para o push não reaplicar essas versões.
2. Reaplicação acidental é inócua para `20261030150000` (apenas
   `create or replace`, `revoke` e `grant` idempotentes), mas o repair evita
   ruído e mantém o histórico fiel.
3. NÃO editar o conteúdo do arquivo `20261030150000` (deve permanecer idêntico
   ao que foi executado em produção).

## Mudanças de dados fora de migration

- 30/10/2026: `profiles.role = 'admin'` para lleschneiater@gmail.com, via
  SQL editor, a pedido explícito da usuária (WhatsApp 30/10/2026 11:09:36,
  wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYFjNFQjBCNTgzNUJENEVGRTJFOTdFQjMA). Mudança de
  DADO, não de schema — `db push` não a toca nem a reverte.

## 2026-10-30 (tarde) — Mensageria real + gate de lancamento

Autorizacao da usuaria (WhatsApp): "pode" 12:54:22 (wamid...FjNFQjA5MDg3QTlEQUMyQ0NBNzc5MDUA), em resposta ao pedido de publicacao completa com conta profissional temporaria, testes e limpeza (wamid...EjY4Q0ZFQTQzRDg5RDE4QTMyRgA=). Continuidade confirmada: "pode continuar" 13:13:39 (wamid...FjNFQjA0QjE4Q0MzRUQzRDFCNTU3OTUA).

Aplicadas via SQL editor (marcador de frescor por run) e registradas em supabase_migrations.schema_migrations:
- 20261030120000 get_profile_public (RPC de contraparte da conversa)
- 20261030130000 mensagens_inicio_papeis (inicio por papeis + remetente aprovado)
- 20261030140000 bloqueio_denuncia (conversation_blocks + message_reports)
- 20261030160000 messaging_gate (allowlist private, flag fechada, profiles.is_test, gates de insert, exclusao de is_test da busca/perfil)
- 20261030160001 is_test_guard (trigger: usuario autenticado nao altera o proprio is_test)
Reparo: 20261030150000 registrada (ja aplicada manualmente as 12:04).

Verificacao pos-aplicacao (catalogo): 6 funcoes private, 2 tabelas, 3 policies em conversation_blocks, 3 em message_reports, flag aberta=false, coluna is_test presente.

Gate FECHADO em producao: envio/bloqueio/denuncia bloqueados para contas fora da allowlist; perfis is_test invisiveis na busca e no perfil publico para usuarios gerais.
