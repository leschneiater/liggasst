-- ============================================================
-- PREPARAÇÃO REVERSÍVEL — NÃO APLICAR EM PRODUÇÃO sem aprovação
-- de publicação da Letícia.
-- Decisão de produto (Letícia, WhatsApp 30/10/2026 09:29:56):
-- "sim!" à proposta de incluir "Bloquear" e "Denunciar" na primeira
-- versão: bloqueio bilateral sem apagar histórico + denúncia para
-- análise da administração.
-- Requer 20261030130000 (remetente_ativo, tem_conversa, pode_iniciar).
-- Reversão: drop tables conversation_blocks e message_reports +
-- reexecutar a messages_insert da migração 20261030130000.
-- ============================================================

-- BLOQUEIO ENTRE USUÁRIOS ----------------------------------------
create table if not exists public.conversation_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.conversation_blocks enable row level security;

grant select, insert, delete on public.conversation_blocks to authenticated;

create policy blocks_select on public.conversation_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert on public.conversation_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete on public.conversation_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function private.tem_bloqueio(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_blocks cb
    where (cb.blocker_id = a and cb.blocked_id = b)
       or (cb.blocker_id = b and cb.blocked_id = a)
  );
$$;

revoke all on function private.tem_bloqueio(uuid, uuid) from public;
grant execute on function private.tem_bloqueio(uuid, uuid) to authenticated;

-- DENÚNCIA PARA A ADMINISTRAÇÃO ----------------------------------
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (reason in ('spam', 'assedio', 'conteudo-improprio', 'golpe', 'outro')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now()
);
alter table public.message_reports enable row level security;

grant select, insert, update on public.message_reports to authenticated;

create policy reports_insert on public.message_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_select on public.message_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy reports_update on public.message_reports for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- POLICY FINAL DE ENVIO (consolida bloqueio + proteções anteriores)
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (select private.remetente_ativo((select auth.uid())))
  and not (select private.tem_bloqueio((select auth.uid()), messages.receiver_id))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
