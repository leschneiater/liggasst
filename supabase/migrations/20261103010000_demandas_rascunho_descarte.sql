-- Rascunho seguro de demandas: a empresa pode descartar (apagar) APENAS
-- rascunhos proprios (status = 'draft'). Demandas ativas, em andamento,
-- concluidas ou canceladas continuam sem opcao de apagar.
--
-- Rascunho ja era invisivel a terceiros: demands_select so expoe 'active'
-- a outras contas (dono e admin leem qualquer status). Nada muda na leitura.
--
-- Reversao: drop policy demands_delete_rascunho on public.demands;
-- revoke delete on public.demands from authenticated;

grant delete on public.demands to authenticated;

drop policy if exists demands_delete_rascunho on public.demands;
create policy demands_delete_rascunho on public.demands for delete to authenticated
  using (company_id = (select auth.uid()) and status = 'draft');
