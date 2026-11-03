-- Certificados compartilhados: ocultar contas de teste de empresas comuns.
-- Mesmo padrao da busca/demandas: perfil is_test so e visivel a testadores
-- (private.messaging_tester, hoje empresa e admin da Leticia).
-- Compatibilidade: profissional real (is_test=false) continua igual.
-- Reversao: recriar a funcao sem a clausula is_test (migration 20261030200000).
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

-- Apoio da Edge Function shared-certificate-url (service role).
-- O schema private nao e exposto na API e service_role nao tem USAGE nele
-- (verificado no banco), entao a function nao le a allowlist direto.
-- Esta funcao fica em public mas so service_role executa: usuarios
-- autenticados NAO conseguem consultar permissoes de terceiros.
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
do $$
begin
  -- service_role existe no Supabase; o guarda so evita falha em bancos de
  -- teste locais (PGlite) que nao criam esse papel.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.certificado_visivel_ao_consultante(uuid, uuid) to service_role;
  end if;
end
$$;
