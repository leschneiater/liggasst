-- ============================================================
-- RECONCILIACAO EXPLICITA: vitrine publica + LinkedIn.
-- Combina os pacotes OAuth (2026103112xxxx) e vitrines
-- (20261031130000) numa definicao FINAL deliberada das duas
-- funcoes de busca — nao depende de "a ultima migracao vencer".
--
-- Decisoes da usuaria (WhatsApp 31/10/2026):
--  a) LinkedIn — "Sim so para logados" (12:35, em resposta a
--     pergunta sobre LinkedIn so para empresas logadas):
--  - anon (vitrine): NAO ve linkedin_url (null);
--  - profissional logado: NAO ve linkedin_url de outros (null);
--  - empresa logada: ve linkedin_url;
--  - o proprio profissional edita o campo na propria pagina de
--    perfil (update direto na linha, grant de coluna — nao passa
--    por estas funcoes).
--  b) Valor/hora e disponibilidade — "Concordo!" (12:52, em
--     resposta a recomendacao de restringir esses dados a empresas
--     logadas): mesma audiencia do linkedin_url — empresa logada
--     ve hourly_rate/availability; anon e profissional recebem
--     null. O dono continua editando os proprios dados pela
--    pagina de perfil (acesso direto a tabela, fora destas
--    funcoes).
-- ============================================================

drop function if exists public.search_professionals(text, text, text);
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
  description text,
  linkedin_url text
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
    ) then pr.linkedin_url else null end as linkedin_url
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%');
$$;

drop function if exists public.get_professional_public(uuid);
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
  description text,
  linkedin_url text
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
    ) then pr.linkedin_url else null end as linkedin_url
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and p.id = p_id;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to anon, authenticated;
revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to anon, authenticated;
