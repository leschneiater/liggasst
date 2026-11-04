-- Destaque pago na busca e na vitrine (pedido dela em 04/11/2026:
-- "o destaque de quem e premium ja precisa ficar em destaque").
--
-- As 4 RPCs de busca/vitrine ganham a coluna `destaque boolean`:
-- true quando a conta tem plano pago vigente, pela MESMA regra unica
-- de acesso pago (private.plano_da_conta: pro_* ativo, ou cancelado/
-- em atraso dentro do periodo pago, somente environment='production').
-- As listagens passam a ordenar por destaque DESC e, em seguida, por
-- nome — antes nao havia ORDER BY (ordem instavel). So expoe um
-- booleano; nenhum dado de cobranca sai da tabela subscriptions.
--
-- Mudanca de tipo de retorno exige DROP + CREATE (create or replace
-- nao altera row type). Filtros, audiencia (linkedin/valor/hora so
-- para empresa logada, is_test) e grants preservados.

-- ------------------------------------------------------------
-- 1) Busca de profissionais (empresa logada ou visitante)
-- ------------------------------------------------------------
drop function if exists public.search_professionals(text, text, text);
create function public.search_professionals(
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
  description text,
  linkedin_url text,
  destaque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.hourly_rate else null end as hourly_rate,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.availability else null end as availability,
    pr.description,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.linkedin_url else null end as linkedin_url,
    (private.plano_da_conta(p.id) <> 'free') as destaque
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%')
  order by destaque desc, p.display_name asc;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Perfil publico de profissional (mesma regra; selo na pagina)
-- ------------------------------------------------------------
drop function if exists public.get_professional_public(uuid);
create function public.get_professional_public(p_id uuid)
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
  description text,
  linkedin_url text,
  destaque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.hourly_rate else null end as hourly_rate,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.availability else null end as availability,
    pr.description,
    case when exists (
      select 1 from public.profiles cp
      where cp.id = (select auth.uid()) and cp.role = 'company'
    ) then pr.linkedin_url else null end as linkedin_url,
    (private.plano_da_conta(p.id) <> 'free') as destaque
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and p.id = p_id;
$$;

revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Busca de empresas (profissional logado)
-- ------------------------------------------------------------
drop function if exists public.search_companies(text, text, text);
create function public.search_companies(
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
  needs text[],
  destaque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, c.segment, c.employee_count, c.description, c.needs,
    (private.plano_da_conta(p.id) <> 'free') as destaque
  from public.profiles p
  join public.companies c on c.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'company'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%')
  order by destaque desc, p.display_name asc;
$$;

revoke all on function public.search_companies(text, text, text) from public;
grant execute on function public.search_companies(text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 4) Vitrine publica de empresas (visitante, sem contato/needs)
-- ------------------------------------------------------------
drop function if exists public.search_companies_public(text, text, text);
create function public.search_companies_public(
  p_state text default null,
  p_city text default null,
  p_segment text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  segment text,
  employee_count text,
  description text,
  destaque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state,
    c.segment, c.employee_count, c.description,
    (private.plano_da_conta(p.id) <> 'free') as destaque
  from public.profiles p
  join public.companies c on c.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'company'
    and not p.is_test
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%')
  order by destaque desc, p.display_name asc;
$$;

revoke all on function public.search_companies_public(text, text, text) from public;
grant execute on function public.search_companies_public(text, text, text) to anon, authenticated;
