-- Dados publicos minimos de um perfil aprovado, para exibir o nome das
-- contrapartes nas conversas de mensagens. Mesma forma de exposicao das
-- RPCs de busca: so campos publicos, so perfis approved, so autenticados.
create or replace function public.get_profile_public(p_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_path text,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_path, p.role
  from public.profiles p
  where p.id = p_id
    and p.verification_status = 'approved';
$$;

revoke all on function public.get_profile_public(uuid) from public;
grant execute on function public.get_profile_public(uuid) to authenticated;
