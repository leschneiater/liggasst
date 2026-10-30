-- Alinha search_companies ao padrao da search_professionals (migracao
-- 20261030160000): perfis de teste (is_test) ficam fora da busca para
-- usuarios fora do gate de validacao.
create or replace function public.search_companies(
  p_state text default null,
  p_city text default null,
  p_segment text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  segment text,
  employee_count text,
  description text,
  needs text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, c.segment, c.employee_count, c.description, c.needs
  from public.profiles p
  join public.companies c on c.profile_id = p.id
  where p.verification_status = 'approved'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%');
$$;

revoke all on function public.search_companies(text, text, text) from public;
grant execute on function public.search_companies(text, text, text) to authenticated;
