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
