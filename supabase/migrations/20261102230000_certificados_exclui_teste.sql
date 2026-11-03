create or replace function public.get_professional_shared_certificates(p_professional_id uuid)
returns table (id uuid, name text, issuer text, issued_at date, expires_at date)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.issuer, c.issued_at, c.expires_at
  from public.certificates c
  where c.professional_id = p_professional_id
    and c.visible_to_companies
    and exists (
      select 1 from public.profiles pp
      where pp.id = p_professional_id
        and pp.role = 'professional'
        and pp.verification_status = 'approved'
        and (not pp.is_test or (select private.messaging_tester((select auth.uid()))))
    )
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'company'
        and p.verification_status = 'approved'
    );
$$;
revoke all on function public.get_professional_shared_certificates(uuid) from public;
grant execute on function public.get_professional_shared_certificates(uuid) to authenticated;

create or replace function public.certificado_visivel_ao_consultante(p_certificate_id uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.certificates c
    join public.profiles pp on pp.id = c.professional_id
    where c.id = p_certificate_id
      and (not pp.is_test or (select private.messaging_tester(p_viewer)))
  );
$$;
revoke all on function public.certificado_visivel_ao_consultante(uuid, uuid) from public, anon, authenticated;
grant execute on function public.certificado_visivel_ao_consultante(uuid, uuid) to service_role;
