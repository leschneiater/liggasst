-- OPCAO C (aguardando decisao da Leticia): impedir envio por cadastro
-- rejeitado/pendente TAMBEM em conversas existentes.
-- Hoje: rejeitado nao inicia conversa nova, mas responde em conversa
-- existente (comportamento original da policy).
-- Reversao: reexecutar a messages_insert da migracao 20261030130000.

create or replace function private.remetente_ativo(a uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles s
    where s.id = a and s.verification_status = 'approved'
  );
$$;

revoke all on function private.remetente_ativo(uuid) from public;
grant execute on function private.remetente_ativo(uuid) to authenticated;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (select private.remetente_ativo((select auth.uid())))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
