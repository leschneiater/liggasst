create or replace function private.pode_iniciar(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles sa
    join public.profiles sb on sb.id = b
    where sa.id = a
      and sa.verification_status = 'approved' and sb.verification_status = 'approved'
      and sa.role = 'company' and sb.role = 'professional'
  );
$$;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (
    exists (
      select 1 from public.messages m
      where (m.sender_id = (select auth.uid()) and m.receiver_id = messages.receiver_id)
         or (m.receiver_id = (select auth.uid()) and m.sender_id = messages.receiver_id)
    )
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
