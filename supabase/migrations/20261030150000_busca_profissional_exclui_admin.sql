-- Correcao: search_professionals e get_professional_public nao filtravam role.
-- Uma conta convertida para admin (com registro profissional preservado, ex.:
-- a proprietaria convertida por solicitacao dela) continuava aparecendo na
-- busca publica de profissionais e no perfil publico por ID.
-- Ajuste: somente profiles com role = 'professional' entram nos dois caminhos.
-- Reversivel: nenhum dado e apagado; reverter a definicao anterior restaura o
-- comportamento antigo. Assinaturas inalteradas, grants preservados.

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
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%');
$$;

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
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and p.id = p_id;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to authenticated;
revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to authenticated;
