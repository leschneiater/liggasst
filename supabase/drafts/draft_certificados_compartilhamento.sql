-- RASCUNHO (não aplicado): visibilidade de certificados para EMPRESAS autenticadas,
-- escolhida certificado a certificado pelo dono. Sem selo/verificação.
-- Não retroativo: default false mantém certificados existentes privados.

alter table public.certificates
  add column if not exists visible_to_companies boolean not null default false;

-- o update policy certificates_update (dono ou admin) já governa a linha;
-- o grant de coluna precisa incluir a nova coluna para o dono poder alterná-la.
grant update (visible_to_companies) on public.certificates to authenticated;

-- Metadados compartilhados, somente para contas empresa autenticadas.
-- Não expõe storage_path nem status; arquivos seguem restritos ao dono (storage RLS).
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
    -- profissional precisa estar aprovado (mesmo padrao da busca/perfil publico)
    and exists (
      select 1 from public.profiles pp
      where pp.id = p_professional_id
        and pp.role = 'professional'
        and pp.verification_status = 'approved'
    )
    -- quem consulta precisa ser empresa aprovada
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'company'
        and p.verification_status = 'approved'
    );
$$;

revoke all on function public.get_professional_shared_certificates(uuid) from public;
grant execute on function public.get_professional_shared_certificates(uuid) to authenticated;
