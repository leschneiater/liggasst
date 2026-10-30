-- OPCAO D: bloqueio entre usuarios (protecao sem moderacao previa).
-- Qualquer participante bloqueia a contraparte; bloqueio impede NOVAS
-- mensagens nos dois sentidos; historico preservado (decisao de UX:
-- esconder ou nao a conversa na lista).
-- Reversao: drop table + reexecutar messages_insert vigente.

create table if not exists public.conversation_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.conversation_blocks enable row level security;

-- Supabase concede por padrao; explicito para clareza
grant select, insert, delete on public.conversation_blocks to authenticated;

-- Cada usuario ve e gerencia apenas os proprios bloqueios
create policy blocks_select on public.conversation_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert on public.conversation_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete on public.conversation_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Checagem bilateral para a policy de mensagens (security definer)
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

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and not (select private.tem_bloqueio((select auth.uid()), messages.receiver_id))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
