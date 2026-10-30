-- ============================================================
-- GATE DE LIBERACAO DE MENSAGENS — fase de validacao antes da
-- abertura geral (autorizacao da Leticia em 30/10/2026 12:54:
-- publicar com conta profissional temporaria de teste, dados
-- ficticios identificados, remocao ao final; liberacao geral
-- somente apos os testes passarem).
--
-- Como funciona:
--  - private.messaging_flags.aberta = false: mensagens so para
--    contas na private.messaging_allowlist (as contas dela + a
--    conta temporaria de teste). Para todo o resto, a policy de
--    insert BLOQUEIA o envio e a UI esconde as entradas.
--  - aberta = true: liberacao geral (flip unico apos validacao).
--  - profiles.is_test: perfil de teste aprovado NAO aparece na
--    busca publica nem no perfil publico para usuarios fora do
--    gate; apenas contas da lista de teste o enxergam, mesmo apos a abertura geral.
--
-- Reversao: drop policy + recriar sem a clausula do gate;
-- drop das tabelas private.messaging_*; a coluna is_test e inerte
-- depois da remocao da conta de teste. Nenhum dado real e tocado.
-- ============================================================

create table if not exists private.messaging_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists private.messaging_flags (
  id boolean primary key default true check (id),
  aberta boolean not null default false
);
insert into private.messaging_flags (id, aberta) values (true, false)
on conflict (id) do nothing;

create or replace function private.messaging_liberado(a uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select aberta from private.messaging_flags where id), false)
      or exists (select 1 from private.messaging_allowlist where user_id = a);
$$;

revoke all on function private.messaging_liberado(uuid) from public;
grant execute on function private.messaging_liberado(uuid) to authenticated;

-- Identidade de TESTADOR (so a lista, sem a flag): usada para que
-- perfis de teste fiquem visiveis apenas aos testadores, mesmo apos a
-- liberacao geral (flag aberta nao pode expor fixture na busca geral).
create or replace function private.messaging_tester(a uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.messaging_allowlist where user_id = a);
$$;

revoke all on function private.messaging_tester(uuid) from public;
grant execute on function private.messaging_tester(uuid) to authenticated;

-- Leitura pela UI: esconder/mostrar entradas de mensagens.
create or replace function public.messaging_disponivel()
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.messaging_liberado((select auth.uid()));
$$;

revoke all on function public.messaging_disponivel() from public;
grant execute on function public.messaging_disponivel() to authenticated;

alter table public.profiles
  add column if not exists is_test boolean not null default false;

-- Gate no envio de mensagens (mantem todas as regras da 130000/140000).
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (select private.remetente_ativo((select auth.uid())))
  and (not (select private.tem_bloqueio((select auth.uid()), messages.receiver_id)))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
  and (select private.messaging_liberado((select auth.uid())))
);

-- Gate no bloqueio e na denuncia (so fazem sentido com mensagens ativas).
drop policy if exists blocks_insert on public.conversation_blocks;
create policy blocks_insert on public.conversation_blocks for insert to authenticated
with check (
  blocker_id = (select auth.uid())
  and blocked_id <> (select auth.uid())
  and (select private.messaging_liberado((select auth.uid())))
);

drop policy if exists reports_insert on public.message_reports;
create policy reports_insert on public.message_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and (select private.messaging_liberado((select auth.uid())))
);

-- Perfis de teste ficam fora da busca e do perfil publico para quem
-- esta fora do gate; contas do gate os enxergam para testar.
create or replace function public.search_professionals(
  p_state text default null,
  p_city text default null,
  p_specialization text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  education text,
  specialization text,
  experience text,
  service_radius text,
  hourly_rate numeric,
  availability text[],
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%');
$$;

create or replace function public.get_professional_public(p_id uuid)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  education text,
  specialization text,
  experience text,
  service_radius text,
  hourly_rate numeric,
  availability text[],
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and p.id = p_id;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to authenticated;
revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to authenticated;
