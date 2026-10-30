-- Certificados: compartilhamento escolhido pelo dono + exclusao propria.
-- Consolidado dos drafts supabase/drafts/draft_certificados_*.sql (aplicados nesta ordem).
-- Autorizacao da dona em 30/10/2026 ~16:10 (-03) para publicar a etapa completa.

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
-- RASCUNHO (não aplicado): higiene de privilégio mínimo.
-- Hoje o dono pode editar storage_path do próprio certificado (grant da
-- migration 20260903190000). Com o compartilhamento, isso permitiria apontar
-- um certificado compartilhado para um caminho fora da própria pasta.
-- A Edge Function já recusa esses caminhos (defesa em profundidade); este
-- revoke remove a coluna do grant. Não há fluxo de substituição de arquivo
-- na v1, então nenhum recurso atual depende desse grant.
revoke update (storage_path) on public.certificates from authenticated;
-- RASCUNHO (não aplicado): permite ao profissional excluir os próprios certificados.
-- Hoje não existe policy de delete em public.certificates: um envio errado não pode
-- ser removido pelo próprio usuário (apenas editado). Aplicar somente com aprovação.
drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates for delete to authenticated
  using (professional_id = (select auth.uid()));

-- alem da policy, o privilegio DELETE nunca foi concedido (migration 20260903190000
-- so concede select/insert/update) — sem este grant a exclusao falha com
-- "permission denied" mesmo com a policy. Confirmado em teste local PG.
grant delete on public.certificates to authenticated;
