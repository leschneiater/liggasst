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

Pos-validacao (mesma sessao): E2E real aprovado (envio/resposta/bloqueio/desbloqueio/denuncia/painel admin), conta de teste e todos os registros removidos (cascata verificada: 0 ocorrencias; 2 contas reais intactas), gate ABERTO (private.messaging_flags.aberta=true) apos Deploy B (475d34b). PAT temporario do GitHub revogado.

## 2026-10-30 (noite) — Maquina de estado de demandas

Autorizacao da usuaria (WhatsApp): "Perfeito vamos seguir" 23:19:23
(wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYIEE1NTk5NjE0MTJFN0U3QTM3MTQ2QUMwQzExQzc3RkRBAA==),
em resposta a proposta de gestao de demandas + relatorios reais + protecao no
banco (demandas encerradas imutaveis, inclusive para admin).

Aplicada via SQL editor:
- 20261031000000_demandas_maquina_estado (trigger BEFORE UPDATE em
  public.demands: demanda completed/cancelled e historico nao aceitam NENHUM
  update; company_id imutavel; transicoes validas draft->active,
  active/in_progress->completed/cancelled; mantem updated_at).
  Funcao private.demanda_guarda_transicao. Reversivel via drop trigger +
  drop function.

Verificacao pos-aplicacao (catalogo read-only): trigger
demanda_guarda_transicao | fn=private.demanda_guarda_transicao | enabled=O
em public.demands. Nenhum registro alterado (migracao so cria funcao+trigger).

## 2026-10-31 (madrugada) — Fluxo de contratos empresa <-> profissional

Autorizacao da usuaria (WhatsApp): "Pode" 00:00:03
(wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYIEE1MUE0MzdCQjM2ODkzNDM3NkE4NjY5OTdFMjM2RTlCAA==),
em resposta a proposta de publicacao com as regras completas do fluxo
(wamid.HBgNNTUxMTkxNDMyMzI2NBUCABEYEjRDRDI0MDJDNDdEMjREREVBNwA=): empresa
propoe, profissional aceita/recusa; aceite tira a demanda da vitrine e
cancela propostas concorrentes; cancelar contrato em andamento devolve a
demanda a vitrine; concluir contrato conclui a demanda junto (ajuste
aprovado em "Pode seguir" 23:57:31); encerrados imutaveis inclusive admin;
valor sem pagamento na plataforma; sem e-mails.

Aplicada via SQL editor:
- 20261031010000_contratos_fluxo (coluna contracts.title; policy
  contracts_insert com validacoes; RPCs security definer
  responder_contrato/concluir_contrato/cancelar_contrato/listar_contratos;
  trigger contrato_guarda_transicao; guarda de demandas estendida com flag
  de transacao app.fluxo_contrato). Registrada em
  supabase_migrations.schema_migrations. Nenhum dado alterado.

Verificacao pos-aplicacao (catalogo read-only): 9 funcoes criadas
(private.contrato_*, private.demanda_guarda_transicao atualizada,
public.responder/concluir/cancelar/listar_contratos), policies
contracts_insert + contracts_select em contracts, triggers
contrato_guarda_transicao e demanda_guarda_transicao enabled=O, grants de
authenticated em contracts = SELECT+INSERT (sem UPDATE), coluna title text
presente.

## 2026-10-31 (madrugada) — Isolamento de demandas de teste na vitrine

Autorizacao da usuaria (WhatsApp): "Pode" 00:51:25
(wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYIEE1NjNFM0I4QzYyQTRCMkZBRUI2MTUyMzI5QUYzNDg4AA==),
em resposta a proposta (wamid.HBgNNTUxMTkxNDMyMzI2NBUCABEYEkUxMzQ2M0QzNzNCRDk4OUY4MQA=)
de aplicar o isolamento no banco e no repo com credencial temporaria revogada
ao final, e retomar o teste completo de contratos+demandas com contas e
registros temporarios removidos ao final. Caveat informado: registros de
teste aparecem temporariamente nos numeros do painel admin.

Aplicada via SQL editor:
- 20261031020000_demandas_isolamento_teste (funcao
  private.perfil_de_teste(uuid); policy demands_select ganha gate is_test no
  ramo status='active': demanda de empresa is_test some da vitrine para
  contas comuns; dona, admin e gate messaging_allowlist seguem vendo).
  Registrada em supabase_migrations.schema_migrations. Nenhum dado alterado.

Verificacao pos-aplicacao (catalogo read-only): funcao
private.perfil_de_teste presente; qual da demands_select com a clausula
(NOT perfil_de_teste OR messaging_tester) no ramo active; versao
20261031020000 presente em schema_migrations.

## 2026-10-31 — 20261031030000_grant_companies_razao_social (PR #24)

Correcao aprovada pela proprietaria (WhatsApp "Pode" 01:06 BRT, wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYIEE1OTI4RDVFOTVFNDgxRUVGNUJFMzJCQTJGMEFDQjk3AA==): `grant update (razao_social) on public.companies to authenticated;`

Bug: coluna razao_social (20261029230000) fora do GRANT por coluna do unify — Publicar Demanda falhava com 42501 na etapa de contato.

Aplicacao: SQL editor do Supabase (projeto ilvrcozeqbdgeuzjgpvf) em 2026-10-31 ~04:07 UTC.
Verificacao: update como role authenticated com JWT da empresa retornou 1 row (antes: 42501 permission denied); versao registrada em supabase_migrations.schema_migrations; publicacao de demanda pela UI validada de ponta a ponta com conta de teste.
Teste PGlite: npm run test:companies-contato — 8/8 (dona positivo; outra empresa/profissional/anon negativo; grant segue por coluna). Red->green confirmado.

## 2026-10-31 (tarde) - Login Google + vitrines publicas

Autorizacao da usuaria (WhatsApp, 31/10/2026 14:39:27): "Pode aplicar!", em resposta a pergunta de 14:37:55 sobre aplicar mudancas no banco, ativar o Google e publicar o site com a politica revisada (wamid.HBgNNTUxMTkxNDMyMzI2NBUCABIYIEE1MkI4N0I3RjY1QThGNDIwMDVEMUFENTYyRkU1MzhEAA==).

Aplicadas via SQL editor em UMA transacao, com guarda de frescor (md5 das 4 funcoes auditadas) e registradas em supabase_migrations.schema_migrations:
- 20261031120000 oauth_cadastro_incompleto
- 20261031120100 completar_cadastro
- 20261031120200 linkedin_url
- 20261031130000 vitrines_publicas
- 20261031140000 reconciliacao_busca_linkedin

Verificacao pos-aplicacao (catalogo): md5 de prosrc das 7 funcoes iguais ao PGlite local; check de verification_status inclui awaiting_completion; trigger profiles_conclusao_cadastro presente; 2 perfis seguem approved; EXECUTE anon+authenticated em search_professionals, get_professional_public e search_companies_public; completar_cadastro so authenticated.
Rollback preparado e NAO executado: ver supabase/drafts/ROLLBACK_migracoes_login_google_NAO_EXECUTADO.sql (nao coberto: constraint, coluna linkedin_url, revoke em ratings).
Provider Google habilitado no Supabase Auth (client ID do projeto GCP liggasst; secret somente no cofre).

## 2026-11-02 (~00:26, -03) — Radar TST (radar_posts)

- `20261102010000_radar_posts.sql` — APLICADA via SQL editor em 02/11/2026
  ~00:26 (-03). Autorizacao: mudancas de banco necessarias ao Radar cobertas
  pela confirmacao da usuaria "Pode continuar com tudo e publicar" (WhatsApp
  02/11/2026 00:11:35) e pelo escopo confirmado pelo assistente principal.
- Verificacao pos-aplicacao:
  - Catalogo: tabela `public.radar_posts` com `rowsecurity=true`; policy
    `radar_posts_select_pagantes` registrada verbatim (exige
    `environment='production'` E `publicado_em <= now()`).
  - Negativo remoto 1: SELECT via PostgREST com anon key → HTTP 200 `[]`
    COM 2 fixtures presentes (controle positivo de existencia via SQL editor).
  - Negativo remoto 2: como conta com assinatura SANDBOX pro ativa
    (set role authenticated + request.jwt.claims no mesmo batch) →
    `count(radar_posts) = 0`; controle na mesma sessao: a propria
    subscription visivel (RLS e claims ativos).
  - Fixtures descartaveis FIXTURE-RLS-* inseridas e DELETADAS; count final 0.
  - Acesso comercial positivo segue PENDENTE: so com a primeira assinatura
    de producao legitima (nenhuma conta artificial marcada como producao).
- Reparo futuro: registrar versao em supabase_migrations.schema_migrations
  antes de qualquer `supabase db push` (mesmo procedimento das anteriores).
