-- Perfil publico de profissional por ID, limitado aos MESMOS campos e a MESMA
-- visibilidade da search_professionals: somente perfis approved, somente
-- usuarios autenticados, sem e-mail, telefone, endereco, cpf ou
-- registration_number. IDs de perfis nao aprovados retornam vazio, igual a um
-- ID inexistente, para nao vazar a existencia do cadastro.

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
    and p.id = p_id;
$$;

revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to authenticated;
