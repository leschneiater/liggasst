-- Maquina de estados de demands no BANCO (nao so na UI).
--
-- Antes: a policy demands_update garantia apenas o DONO da linha; uma conta
-- empresa podia, via SQL/API direta, reabrir demanda encerrada, editar
-- historico concluido ou transferir a demanda para outro dono. O app nunca
-- oferecia esses caminhos, mas o banco nao impedia.
--
-- Depois (trigger before update, vale para qualquer papel, inclusive admin):
--   - demanda encerrada (completed/cancelled) e historico: NENHUM update;
--   - company_id imutavel em qualquer estado (sem troca de proprietario);
--   - transicoes de status validas:
--       draft       -> active                    (publicacao de rascunho)
--       active      -> completed | cancelled     (encerramento pela empresa)
--       in_progress -> completed | cancelled     (fluxo futuro de contratos)
--     mesma-par-mesma (edicao de conteudo) segue permitida fora de encerrada;
--   - updated_at passa a ser mantido no update.
--
-- Fluxos legitimos preservados: insert (policy demands_insert), edicao de
-- demanda ativa pelo dono, concluir/cancelar demanda ativa, cancelamento de
-- demanda ativa por admin (moderacao), leitura/vitrine (demands_select).
--
-- Reversao: drop trigger demanda_guarda_transicao on public.demands;
-- drop function private.demanda_guarda_transicao(). Nenhum dado e tocado.

create or replace function private.demanda_guarda_transicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Encerrada e historico imutavel: nada de reabrir, editar ou trocar dono.
  if old.status in ('completed', 'cancelled') then
    raise exception 'demanda encerrada (%) nao pode ser alterada', old.status;
  end if;

  -- Proprietario imutavel em qualquer estado.
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id da demanda nao pode ser alterado';
  end if;

  -- Maquina de estados nas mudancas de status.
  if new.status is distinct from old.status
     and not (
       (old.status = 'draft' and new.status = 'active')
       or (old.status = 'active' and new.status in ('completed', 'cancelled'))
       or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
     ) then
    raise exception 'transicao de status invalida: % -> %', old.status, new.status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists demanda_guarda_transicao on public.demands;
create trigger demanda_guarda_transicao
  before update on public.demands
  for each row execute function private.demanda_guarda_transicao();
