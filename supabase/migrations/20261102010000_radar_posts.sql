-- Radar TST: artigos do blog exclusivo para assinantes pagos dos dois
-- publicos (profissional e empresa), confirmado pela dona do produto no
-- WhatsApp em 02/11/2026 ("Será um blog visível para os pagantes" 00:07:34,
-- "Dos dois" 00:08:33).
--
-- PROTECAO REAL: o conteudo NAO vai no bundle do frontend nem em endpoint
-- publico. A leitura so acontece via PostgREST com esta RLS, que espelha a
-- mesma regra do cliente (assinaturaPagaAtiva em src/utils/assinaturaAcesso.ts):
-- plano pro ativo, ou cancelado/em atraso ainda dentro do periodo pago.
-- Fail-closed: sem assinatura paga ativa, zero linhas.
--
-- SEM CMS/fluxo editorial: enquanto a fonte editorial nao for decidida,
-- conteudo entra so por SQL com service role (sem policies de escrita).
--
-- ISOLAMENTO DE AMBIENTE: so assinatura com environment='production' libera
-- leitura. Assinatura sandbox (conta de teste allowlisted) NAO vira acesso
-- pago real por engano: teste de regra acontece em ambiente local (PGlite),
-- nunca como acesso comercial em producao. Enquanto nao existir cobranca
-- real, NINGUEM le artigos — estado honesto ate a ativacao real.
-- RASCUNHOS/AGENDAMENTO: publicado_em e timestamp COM hora e fuso; so
-- aparece no SELECT quando publicado_em <= now(). Artigo agendado para
-- mais tarde no MESMO dia NAO vaza por comparacao de data.

create table if not exists public.radar_posts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  resumo text not null,
  conteudo text not null,
  publicado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.radar_posts enable row level security;

-- Leitura via PostgREST apenas para contas autenticadas; a policy abaixo
-- restringe de fato a pagantes. Anon nao recebe grant nenhum.
grant select on public.radar_posts to authenticated;

-- Mesma regra do gate do cliente, agora no banco: plano pro dos dois
-- publicos ativo; cancelado/em atraso vale ate o fim do periodo pago.
create policy "radar_posts_select_pagantes"
  on public.radar_posts for select
  to authenticated
  using (exists (
    select 1 from public.subscriptions s
    where s.profile_id = auth.uid()
      and s.plan in ('pro_professional', 'pro_company')
      and (
        s.status = 'active'
        or (s.status in ('canceled', 'past_due')
            and s.current_period_end >= current_date)
      )
      and s.environment = 'production'
  )
  and publicado_em <= now());

-- Sem policy de insert/update/delete para authenticated:
-- conteudo entra e sai so via service role (SQL direto), ate decisao editorial.
