-- Limites do plano gratuito (decisao da dona em 03/11/2026, aprovacao para
-- ligar os 3 limites com aviso no app + texto do Termos 8.1):
--   profissional free: ate 5 certificados visiveis para empresas e ate 5
--     contatos novos iniciados por mes;
--   empresa free: ate 3 demandas ativas (active/in_progress);
--   pagante (private.plano_da_conta <> 'free'): sem limite fixo.
-- Nada e apagado: certificados alem de 5 ficam salvos (so nao aparecem),
-- demandas e conversas existentes seguem funcionando e responder mensagens
-- continua livre (limite so conta INICIO de contato novo).
-- Usa private.plano_da_conta (migration 20261104010000): plano pro ativo,
-- ou cancelado/em atraso dentro do periodo pago, so producao.
-- Reversao: recriar get_professional_shared_certificates sem ORDER/LIMIT
-- (migration 20261102230000), recriar messages_insert sem a clausula
-- contato_novo_liberado (20261030160000), recriar demands_insert sem a
-- clausula (20261029230001), recriar private.demanda_guarda_transicao sem
-- o trecho do limite (20261031000000) e drop das funcoes novas.

-- 1) Certificados: no maximo 5 visiveis quando o profissional e free.
--    Demais regras mantidas (visible_to_companies, perfil aprovado,
--    is_test so para tester, consultante empresa aprovada). Pagante ve
--    todos (limit null = sem limite).
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
    and exists (
      select 1 from public.profiles pp
      where pp.id = p_professional_id
        and pp.role = 'professional'
        and pp.verification_status = 'approved'
        and (not pp.is_test or (select private.messaging_tester((select auth.uid()))))
    )
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'company'
        and p.verification_status = 'approved'
    )
  order by c.issued_at desc nulls last, c.created_at desc, c.id
  limit (case when private.plano_da_conta(p_professional_id) = 'free' then 5 else null end);
$$;
revoke all on function public.get_professional_shared_certificates(uuid) from public;
grant execute on function public.get_professional_shared_certificates(uuid) to authenticated;

-- 2) Contatos novos do profissional free: ate 5 inicios por mes (mes em
--    horario de Sao Paulo). Conversa existente (qualquer direcao) nao
--    conta: responder continua livre.
create or replace function private.contato_novo_liberado(a uuid, b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  inicio_mes timestamptz;
begin
  -- Limite so para inicio profissional -> empresa no plano free.
  if private.plano_da_conta(a) <> 'free' then return true; end if;
  if not exists (
    select 1 from public.profiles sa
    join public.profiles sb on sb.id = b
    where sa.id = a and sa.role = 'professional' and sb.role = 'company'
  ) then return true; end if;
  -- Ja conversaram (qualquer direcao): nao e contato novo.
  if exists (
    select 1 from public.messages m
    where (m.sender_id = a and m.receiver_id = b)
       or (m.sender_id = b and m.receiver_id = a)
  ) then return true; end if;
  inicio_mes := (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  return (
    select count(*) from (
      select m.receiver_id
      from public.messages m
      where m.sender_id = a
        and m.created_at >= inicio_mes
        and not exists (
          select 1 from public.messages x
          where ((x.sender_id = a and x.receiver_id = m.receiver_id)
              or (x.sender_id = m.receiver_id and x.receiver_id = a))
            and x.created_at < m.created_at
        )
      group by m.receiver_id
    ) contatos
  ) < 5;
end;
$$;
revoke all on function private.contato_novo_liberado(uuid, uuid) from public;
grant execute on function private.contato_novo_liberado(uuid, uuid) to authenticated;

-- Gate no envio (todas as regras anteriores mantidas + limite de contato novo).
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (select private.remetente_ativo((select auth.uid())))
  and (not (select private.tem_bloqueio((select auth.uid()), messages.receiver_id)))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
  and (select private.messaging_liberado((select auth.uid())))
  and (select private.contato_novo_liberado((select auth.uid()), messages.receiver_id))
);

-- 3) Demandas ativas da empresa free: ate 3 (active/in_progress; rascunho
--    nao conta; concluida/cancelada libera espaco).
create or replace function private.empresa_pode_ativar_demanda(a uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.plano_da_conta(a) <> 'free'
    or (select count(*) from public.demands d
        where d.company_id = a and d.status in ('active', 'in_progress')) < 3;
$$;
revoke all on function private.empresa_pode_ativar_demanda(uuid) from public;
grant execute on function private.empresa_pode_ativar_demanda(uuid) to authenticated;

drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands for insert to authenticated
  with check (
    company_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'company'
    )
    and (status <> 'active' or (select private.empresa_pode_ativar_demanda((select auth.uid()))))
  );

-- Publicacao de rascunho (draft -> active) passa pelo mesmo limite. Demais
-- regras da maquina de estados mantidas (20261031000000).
create or replace function private.demanda_guarda_transicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'demanda encerrada (%) nao pode ser alterada', old.status;
  end if;
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id da demanda nao pode ser alterado';
  end if;
  if new.status is distinct from old.status
     and not (
       (old.status = 'draft' and new.status = 'active')
       or (old.status = 'active' and new.status in ('completed', 'cancelled'))
       or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
     ) then
    raise exception 'transicao de status invalida: % -> %', old.status, new.status;
  end if;
  if old.status = 'draft' and new.status = 'active'
     and not private.empresa_pode_ativar_demanda(new.company_id) then
    raise exception 'limite de 3 demandas ativas no plano gratuito';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 4) Leituras da PROPRIA conta para o aviso previo no app (nao expoem
--    dados de terceiros nem alteram regras; o banco continua decidindo).
create or replace function public.limite_contato_novo_atingido(p_receiver uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not private.contato_novo_liberado((select auth.uid()), p_receiver);
$$;
revoke all on function public.limite_contato_novo_atingido(uuid) from public;
grant execute on function public.limite_contato_novo_atingido(uuid) to authenticated;

create or replace function public.demandas_ativas_minhas()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.demands d
  where d.company_id = (select auth.uid()) and d.status in ('active', 'in_progress');
$$;
revoke all on function public.demandas_ativas_minhas() from public;
grant execute on function public.demandas_ativas_minhas() to authenticated;
