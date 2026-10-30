-- Endurecimento independente da politica demands_insert: exigir papel company.
-- Antes: qualquer usuario autenticado podia inserir demanda com o proprio id
-- (inclusive conta profissional, via a linha companies orfa). A restricao por
-- papel passa a valer tambem no banco, alem da rota. Nao depende da remocao
-- da linha orfa: o papel e verificado em profiles.
drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands for insert to authenticated
  with check (
    company_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'company'
    )
  );
