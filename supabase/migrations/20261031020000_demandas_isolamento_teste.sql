-- Isolamento de demandas de TESTE na vitrine.
--
-- Antes: a policy demands_select expoe TODA demanda status='active' a
-- qualquer usuario autenticado, sem filtro is_test (a busca de perfis ja
-- tem esse isolamento desde 20261030160000_messaging_gate.sql). Uma
-- demanda criada por uma conta de teste apareceria na vitrine de contas
-- reais durante a validacao em producao.
--
-- Depois: no ramo da vitrine (status='active'), a demanda some quando a
-- empresa dona tem profiles.is_test = true, EXCETO para contas do gate de
-- teste (private.messaging_allowlist - a mesma identidade de testador da
-- busca de perfis, que precisa enxergar o fixture para testa-lo).
-- A derivacao e ao vivo de profiles.is_test: marcar a flag esconde na
-- hora inclusive demandas ja publicadas; desmarcar reexpoem.
--
-- Fluxos preservados (nada muda):
--   - a dona sempre ve e edita as proprias demandas (1o ramo);
--   - admin continua vendo tudo, inclusive fixtures (3o ramo, moderacao);
--   - demandas de contas reais seguem visiveis na vitrine;
--   - insert, update, a maquina de estados e o fluxo de contratos
--     (security definer) nao sao tocados;
--   - anon (sem login) ja nao tinha acesso e segue sem.
--
-- Reversao: drop policy demands_select + recriar sem a clausula do gate;
-- drop function private.perfil_de_teste. Nenhum dado e tocado.

create or replace function private.perfil_de_teste(a uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.is_test from public.profiles p where p.id = a), false);
$$;

revoke all on function private.perfil_de_teste(uuid) from public;
grant execute on function private.perfil_de_teste(uuid) to authenticated;

drop policy if exists demands_select on public.demands;
create policy demands_select on public.demands for select to authenticated
  using (
    company_id = (select auth.uid())
    or (
      status = 'active'
      and (
        not (select private.perfil_de_teste(company_id))
        or (select private.messaging_tester((select auth.uid())))
      )
    )
    or (select private.is_admin())
  );
