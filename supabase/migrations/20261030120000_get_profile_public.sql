-- Dados publicos minimos de uma CONTRAPARTE de conversa, para exibir nomes
-- na area de mensagens. Escopo deliberadamente restrito: so perfis approved
-- que ja trocaram mensagens com o usuario autenticado. Perfis novos (sem
-- conversa) ja tem nome exposto pelas RPCs publicas de busca existentes.
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
    and p.verification_status = 'approved'
    and exists (
      select 1 from public.messages m
      where (m.sender_id = (select auth.uid()) and m.receiver_id = p.id)
         or (m.receiver_id = (select auth.uid()) and m.sender_id = p.id)
    );
$$;

revoke all on function public.get_profile_public(uuid) from public;
grant execute on function public.get_profile_public(uuid) to authenticated;
