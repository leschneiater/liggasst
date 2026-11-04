-- Corrige recursao infinita (42P17) ao atribuir treinamento a funcionario,
-- encontrada no teste de QA de 04/11/2026: a policy de insert em
-- team_training_assignments consultava public.trainings com RLS ligada e a
-- policy trainings_employee_select consulta team_training_assignments de
-- volta, fechando o ciclo. Toda atribuicao falhava com 500.
-- O helper security definer abaixo verifica "treinamento publicado" sem
-- passar pela RLS de trainings, quebrando o ciclo.

create or replace function private.training_publicada(p_training uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainings t
    where t.id = p_training and t.status = 'published'
  );
$$;

revoke all on function private.training_publicada(uuid) from public;
grant execute on function private.training_publicada(uuid) to authenticated;

drop policy if exists team_assignments_company_insert on public.team_training_assignments;
create policy team_assignments_company_insert on public.team_training_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.company_employees e
      where e.id = company_employee_id
        and e.company_id = (select auth.uid())
        and (select private.plano_da_conta(e.company_id)) <> 'free'
    )
    and (select private.training_publicada(training_id))
  );
