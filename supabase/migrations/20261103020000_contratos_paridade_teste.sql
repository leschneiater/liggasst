-- Contratos: proposta so entre contas do MESMO lado do gate de teste.
--
-- Antes: contracts_insert checava apenas role e verification_status =
-- 'approved'. Uma empresa de teste (profiles.is_test) podia propor contrato a
-- um profissional REAL aprovado, que a enxergaria em listar_contratos (e o
-- inverso: empresa real propondo a conta de teste).
--
-- Depois: a proposta exige paridade de is_test entre empresa e profissional
-- (ambos teste ou ambos reais). Teste->real e real->teste sao rejeitados pela
-- policy. Nada de dados e tocado (contracts estava vazia); gate, allowlist,
-- cadastros e as RPCs responder/cancelar/concluir ficam como estavam. Mudar
-- is_test segue sendo operacao administrativa (profiles_sensitive_guard).
--
-- Reversao: recriar contracts_insert sem a ultima condicao e
-- drop function private.contrato_mesmo_lado(uuid, uuid).

create or replace function private.contrato_mesmo_lado(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select pa.is_test from public.profiles pa where pa.id = a), false)
       = coalesce((select pb.is_test from public.profiles pb where pb.id = b), false);
$$;

revoke all on function private.contrato_mesmo_lado(uuid, uuid) from public;
grant execute on function private.contrato_mesmo_lado(uuid, uuid) to authenticated;

drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert to authenticated
with check (
  company_id = (select auth.uid())
  and professional_id <> (select auth.uid())
  and status = 'pending'
  and progress = 0
  and (select private.contrato_empresa_ativa((select auth.uid())))
  and (select private.contrato_profissional_valido(professional_id))
  and (demand_id is null or (select private.contrato_demanda_valida(demand_id, (select auth.uid()))))
  and (select private.contrato_mesmo_lado((select auth.uid()), professional_id))
);
