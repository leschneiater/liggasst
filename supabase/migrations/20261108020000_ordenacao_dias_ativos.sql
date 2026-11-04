-- Ordenacao por frequencia de acesso dentro do grupo premium
-- (pedido dela em 04/11/2026: "a visualizacao tem que ser por quem
-- tem o premium por quem mais acessa"; Opcao A aprovada: dias ativos
-- nos ultimos 30 dias).
--
-- Nova tabela public.acesso_diario: 1 linha por usuario por dia,
-- gravada pelo app ao carregar a sessao (upsert silencioso). RLS:
-- cada usuario so insere/le a propria linha; visitante (anon) nao
-- grava nada. A contagem NAO sai em coluna publica: so muda a ordem.
--
-- As 3 listagens (search_professionals, search_companies,
-- search_companies_public) passam a ordenar por:
--   destaque DESC, dias ativos (30d) DESC, display_name ASC.
-- get_professional_public devolve 1 linha: sem ORDER BY.
-- Dado historico comeca a acumular na publicacao; ate la todos
-- empatam em 0 e vale o desempate alfabetico.

create table if not exists public.acesso_diario (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  primary key (user_id, dia)
);

alter table public.acesso_diario enable row level security;

create policy acesso_diario_select_proprio
  on public.acesso_diario for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy acesso_diario_insert_proprio
  on public.acesso_diario for insert
  to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.acesso_diario from public;
grant select, insert on public.acesso_diario to authenticated;

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
  left join lateral (
    select count(*) as dias
    from public.acesso_diario a
    where a.user_id = p.id and a.dia >= current_date - 30
  ) ad on true
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%')
  order by destaque desc, ad.dias desc, p.display_name asc;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Busca de empresas (profissional logado)
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
  left join lateral (
    select count(*) as dias
    from public.acesso_diario a
    where a.user_id = p.id and a.dia >= current_date - 30
  ) ad on true
  where p.verification_status = 'approved'
    and p.role = 'company'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%')
  order by destaque desc, ad.dias desc, p.display_name asc;
$$;

revoke all on function public.search_companies(text, text, text) from public;
grant execute on function public.search_companies(text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 3) Vitrine publica de empresas (visitante, sem contato/needs)
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
  left join lateral (
    select count(*) as dias
    from public.acesso_diario a
    where a.user_id = p.id and a.dia >= current_date - 30
  ) ad on true
  where p.verification_status = 'approved'
    and p.role = 'company'
    and not p.is_test
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%')
  order by destaque desc, ad.dias desc, p.display_name asc;
$$;

revoke all on function public.search_companies_public(text, text, text) from public;
grant execute on function public.search_companies_public(text, text, text) to anon, authenticated;
