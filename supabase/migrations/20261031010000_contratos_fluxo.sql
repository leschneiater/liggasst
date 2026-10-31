-- ============================================================
-- PREPARAÇÃO REVERSÍVEL — NÃO APLICAR EM PRODUÇÃO sem aprovação
-- de publicação da Letícia.
--
-- Fluxo de contratos (área "Contratos" dos dois painéis):
--  - Empresa propõe o contrato (insert direto, policy com validações):
--    profissional aprovado, demanda opcional da própria empresa e ativa,
--    status inicial sempre 'pending'.
--  - Profissional aceita ou recusa SOMENTE via RPC responder_contrato.
--    No aceite, na MESMA TRANSAÇÃO: a demanda vinculada (se houver) vai a
--    'in_progress' e sai da vitrine; se ela já não estiver ativa (outra
--    proposta aceita, ou encerrada pela empresa), o aceite falha por
--    conflito e NADA muda. Propostas pendentes concorrentes para a mesma
--    demanda são canceladas automaticamente, ficando no histórico.
--  - Empresa conclui (RPC concluir_contrato): a demanda vinculada é
--    concluída JUNTO, na mesma transação — serviço terminado não fica
--    "em andamento" para sempre. Se a empresa já a encerrou antes,
--    nada é reaberto nem sobrescrito.
--  - Qualquer parte cancela (RPC cancelar_contrato); ao cancelar um
--    contrato em andamento, a demanda vinculada VOLTA à vitrine
--    ('active'), se ainda estiver 'in_progress'.
--  - Não há grant de UPDATE na tabela: toda transição passa pelas RPCs,
--    como nas mensagens.
--  - Trigger contrato_guarda_transicao (mesmo padrão das demandas):
--    contrato completed/cancelled é histórico IMUTÁVEL para qualquer
--    papel, inclusive admin; partes e demanda vinculada não mudam;
--    transições válidas: pending->in_progress|cancelled,
--    in_progress->completed|cancelled; mantém updated_at.
--  - listar_contratos: leitura das próprias tratativas já com o nome da
--    contraparte e o título da demanda (o profissional não tem leitura
--    direta da demanda alheia pela RLS).
--  - Guarda de demandas estendida: active<->in_progress passa a ser
--    válida APENAS dentro de responder_contrato/cancelar_contrato (flag
--    de transação app.fluxo_contrato). Fora desses caminhos, nada muda
--    nas regras da 20261031000000. A flag é ligada por set_config dentro
--    das RPCs security definer; clientes da API não executam SQL livre
--    nem funções de pg_catalog, e mesmo com a flag a policy
--    demands_update limita o efeito à demanda da própria empresa.
--  - Concorrência: o SELECT ... FOR UPDATE das RPCs serializa operações
--    sobre o mesmo contrato, e o UPDATE condicional da demanda
--    (status='active') faz dois aceites simultâneos para a mesma demanda
--    se resolverem pela fila de lock: o segundo encontra 0 linhas e
--    falha por conflito, sem sobrescrever nada.
--  - Coluna title (opcional, até 200 caracteres): identifica contratos
--    sem demanda vinculada.
--
-- Reversão: drop policy contracts_insert; drop functions
-- public.responder_contrato, public.concluir_contrato,
-- public.cancelar_contrato, public.listar_contratos,
-- private.contrato_empresa_ativa, private.contrato_profissional_valido,
-- private.contrato_demanda_valida; drop trigger contrato_guarda_transicao
-- + drop function private.contrato_guarda_transicao; restaurar
-- private.demanda_guarda_transicao da 20261031000000; alter table
-- public.contracts drop column title. Nenhum dado é tocado.
-- ============================================================

alter table public.contracts
  add column if not exists title text
  check (title is null or char_length(title) between 1 and 200);

-- ---------- validações da proposta (policy de insert) ----------

create or replace function private.contrato_empresa_ativa(e uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.companies c on c.profile_id = p.id
    where p.id = e and p.role = 'company' and p.verification_status = 'approved'
  );
$$;

create or replace function private.contrato_profissional_valido(p uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles pr
    join public.professionals s on s.profile_id = pr.id
    where pr.id = p and pr.role = 'professional' and pr.verification_status = 'approved'
  );
$$;

create or replace function private.contrato_demanda_valida(d uuid, empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.demands d2
    where d2.id = d and d2.company_id = empresa and d2.status = 'active'
  );
$$;

revoke all on function private.contrato_empresa_ativa(uuid) from public;
grant execute on function private.contrato_empresa_ativa(uuid) to authenticated;
revoke all on function private.contrato_profissional_valido(uuid) from public;
grant execute on function private.contrato_profissional_valido(uuid) to authenticated;
revoke all on function private.contrato_demanda_valida(uuid, uuid) from public;
grant execute on function private.contrato_demanda_valida(uuid, uuid) to authenticated;

grant insert on public.contracts to authenticated;

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
);

-- ---------- transições (somente via RPCs; sem grant de update) ----------

create or replace function public.responder_contrato(p_contract_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contracts%rowtype;
begin
  if p_acao not in ('aceitar', 'recusar') then
    raise exception 'acao invalida: %', p_acao;
  end if;

  -- FOR UPDATE serializa respostas/cancelamentos concorrentes sobre o
  -- mesmo contrato: quem espera no lock rele a linha ja commitada e
  -- valida o status atual antes de agir.
  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contrato nao encontrado';
  end if;
  if c.professional_id <> (select auth.uid()) then
    raise exception 'somente o profissional contratado responde a proposta';
  end if;
  if c.status <> 'pending' then
    raise exception 'este contrato nao esta mais aguardando resposta';
  end if;

  if p_acao = 'aceitar' then
    -- Libera active<->in_progress na guarda de demandas só nesta transação.
    perform set_config('app.fluxo_contrato', '1', true);
    if c.demand_id is not null then
      -- Concorrência: se a demanda já não está ativa (outra proposta foi
      -- aceita, ou a empresa a encerrou), o aceite falha e nada muda.
      update public.demands set status = 'in_progress'
      where id = c.demand_id and status = 'active';
      if not found then
        raise exception 'esta demanda nao esta mais ativa; outra proposta pode ter sido aceita';
      end if;
      -- Propostas pendentes concorrentes para a mesma demanda saem da fila
      -- e ficam no histórico como canceladas.
      update public.contracts set status = 'cancelled'
      where demand_id = c.demand_id and status = 'pending' and id <> c.id;
    end if;
    update public.contracts set status = 'in_progress' where id = c.id;
  else
    update public.contracts set status = 'cancelled' where id = c.id;
  end if;
end;
$$;

create or replace function public.concluir_contrato(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contracts%rowtype;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contrato nao encontrado';
  end if;
  if c.company_id <> (select auth.uid()) then
    raise exception 'somente a empresa contratante conclui o contrato';
  end if;
  if c.status <> 'in_progress' then
    raise exception 'este contrato nao esta em andamento';
  end if;

  -- A demanda vinculada e concluida junto, na mesma transacao: servico
  -- terminado nao fica em andamento. Se a empresa ja a encerrou antes,
  -- o update condicional afeta 0 linhas e nada e sobrescrito.
  if c.demand_id is not null then
    update public.demands set status = 'completed'
    where id = c.demand_id and status = 'in_progress';
  end if;
  update public.contracts set status = 'completed', progress = 100 where id = c.id;
end;
$$;

create or replace function public.cancelar_contrato(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contracts%rowtype;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contrato nao encontrado';
  end if;
  if c.company_id <> (select auth.uid()) and c.professional_id <> (select auth.uid()) then
    raise exception 'somente as partes do contrato podem cancela-lo';
  end if;
  if c.status not in ('pending', 'in_progress') then
    raise exception 'este contrato ja esta encerrado';
  end if;

  perform set_config('app.fluxo_contrato', '1', true);
  update public.contracts set status = 'cancelled' where id = c.id;

  -- Contrato em andamento desfeito: a demanda vinculada volta à vitrine,
  -- se ainda estiver em andamento (a empresa pode tê-la encerrado antes).
  if c.status = 'in_progress' and c.demand_id is not null then
    update public.demands set status = 'active'
    where id = c.demand_id and status = 'in_progress';
  end if;
end;
$$;

revoke all on function public.responder_contrato(uuid, text) from public;
grant execute on function public.responder_contrato(uuid, text) to authenticated;
revoke all on function public.concluir_contrato(uuid) from public;
grant execute on function public.concluir_contrato(uuid) to authenticated;
revoke all on function public.cancelar_contrato(uuid) from public;
grant execute on function public.cancelar_contrato(uuid) to authenticated;

-- ---------- leitura das próprias tratativas (com nomes) ----------

create or replace function public.listar_contratos()
returns table (
  id uuid,
  demand_id uuid,
  company_id uuid,
  professional_id uuid,
  status text,
  title text,
  amount numeric,
  starts_at date,
  ends_at date,
  progress smallint,
  created_at timestamptz,
  contraparte_nome text,
  demanda_titulo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.demand_id, c.company_id, c.professional_id, c.status, c.title,
    c.amount, c.starts_at, c.ends_at, c.progress, c.created_at,
    case when c.company_id = (select auth.uid()) then prof.display_name else emp.display_name end,
    d.title
  from public.contracts c
  join public.profiles emp on emp.id = c.company_id
  join public.profiles prof on prof.id = c.professional_id
  left join public.demands d on d.id = c.demand_id
  where c.company_id = (select auth.uid()) or c.professional_id = (select auth.uid())
  order by c.created_at desc;
$$;

revoke all on function public.listar_contratos() from public;
grant execute on function public.listar_contratos() to authenticated;

-- ---------- guarda do histórico (mesmo padrão das demandas) ----------

create or replace function private.contrato_guarda_transicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Encerrado é histórico imutável: nada de reabrir, editar ou trocar partes.
  if old.status in ('completed', 'cancelled') then
    raise exception 'contrato encerrado (%) nao pode ser alterado', old.status;
  end if;

  -- Partes e demanda vinculada imutáveis em qualquer estado.
  if new.company_id is distinct from old.company_id
     or new.professional_id is distinct from old.professional_id
     or new.demand_id is distinct from old.demand_id then
    raise exception 'partes e demanda do contrato nao podem ser alteradas';
  end if;

  -- Máquina de estados.
  if new.status is distinct from old.status
     and not (
       (old.status = 'pending' and new.status in ('in_progress', 'cancelled'))
       or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
     ) then
    raise exception 'transicao de status invalida: % -> %', old.status, new.status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contrato_guarda_transicao on public.contracts;
create trigger contrato_guarda_transicao
  before update on public.contracts
  for each row execute function private.contrato_guarda_transicao();

-- ---------- guarda de demandas: active<->in_progress só via contrato ----
-- Regras da 20261031000000 preservadas; a única adição é o par
-- active<->in_progress quando a atualização vem do aceite/cancelamento de
-- contrato (as RPCs ligam a flag app.fluxo_contrato na mesma transação).

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
       or (old.status = 'active' and new.status = 'in_progress'
           and current_setting('app.fluxo_contrato', true) = '1')
       or (old.status = 'in_progress' and new.status = 'active'
           and current_setting('app.fluxo_contrato', true) = '1')
     ) then
    raise exception 'transicao de status invalida: % -> %', old.status, new.status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
