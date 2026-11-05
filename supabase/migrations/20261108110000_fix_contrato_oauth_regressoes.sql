-- Corrige duas regressoes introduzidas por reescritas recentes:
--
-- 1) 20261104020000_limites_plano_gratuito reescreveu
--    private.demanda_guarda_transicao e derrubou a excecao do fluxo de
--    contrato (app.fluxo_contrato = '1'), que permite active <-> in_progress
--    durante responder_contrato/concluir. Sem ela, aceitar uma proposta
--    falha com "transicao de status invalida: active -> in_progress".
--    Restaura a excecao mantendo o limite do plano gratuito.
--
-- 2) 20261107010000_capacitacao_equipe reescreveu private.handle_new_user
--    marcando TODO cadastro novo como 'approved' e lendo so
--    display_name da metadata. Login social (Google/LinkedIn, sem role na
--    metadata) voltou a nascer aprovado e com nome vazio, furando o fluxo
--    de conclusao de cadastro (awaiting_completion -> completar_cadastro).
--    Restaura: sem role na metadata => 'awaiting_completion'; fallback de
--    nome full_name/name do provedor OAuth; papel 'employee' da equipe
--    mantido.

-- 1) Guarda de transicao de demandas: active <-> in_progress liberado so na
--    transacao do fluxo de contrato (set_config em responder_contrato).
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
       or (old.status = 'active' and new.status = 'in_progress'
           and current_setting('app.fluxo_contrato', true) = '1')
       or (old.status = 'in_progress' and new.status = 'active'
           and current_setting('app.fluxo_contrato', true) = '1')
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

-- 2) Cadastro: e-mail/senha (role na metadata) nasce approved; login social
--    sem role nasce awaiting_completion e conclui pelo completar_cadastro.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  metadata jsonb;
  tem_role boolean;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  tem_role := metadata ->> 'role' in ('professional', 'company', 'employee');
  requested_role := case metadata ->> 'role'
    when 'company' then 'company'
    when 'employee' then 'employee'
    else 'professional'
  end;

  insert into public.profiles (
    id, email, role, display_name, phone, postal_code, city, state, address,
    verification_status
  ) values (
    new.id,
    coalesce(new.email, ''),
    requested_role,
    coalesce(
      nullif(metadata ->> 'display_name', ''),
      nullif(metadata ->> 'full_name', ''),
      nullif(metadata ->> 'name', ''),
      ''
    ),
    nullif(metadata ->> 'phone', ''),
    nullif(metadata ->> 'postal_code', ''),
    nullif(metadata ->> 'city', ''),
    case
      when upper(coalesce(metadata ->> 'state', '')) ~ '^[A-Z]{2}$'
        then upper(metadata ->> 'state')
      else null
    end,
    nullif(metadata ->> 'address', ''),
    case when tem_role then 'approved' else 'awaiting_completion' end
  );

  if requested_role = 'professional' then
    insert into public.professionals (
      profile_id, cpf, education, specialization, experience,
      registration_number, service_radius, hourly_rate, availability, description
    ) values (
      new.id,
      nullif(metadata ->> 'cpf', ''),
      nullif(metadata ->> 'education', ''),
      nullif(metadata ->> 'specialization', ''),
      nullif(metadata ->> 'experience', ''),
      nullif(metadata ->> 'registration_number', ''),
      nullif(metadata ->> 'service_radius', ''),
      case
        when coalesce(metadata ->> 'hourly_rate', '') ~ '^\d+([.,]\d+)?$'
          then replace(metadata ->> 'hourly_rate', ',', '.')::numeric
        else null
      end,
      case
        when jsonb_typeof(metadata -> 'availability') = 'array'
          then array(select jsonb_array_elements_text(metadata -> 'availability'))
        else '{}'::text[]
      end,
      nullif(metadata ->> 'description', '')
    );
  elsif requested_role = 'company' then
    insert into public.companies (
      profile_id, cnpj, segment, employee_count, responsible_name,
      responsible_role, responsible_email, responsible_phone, description, needs
    ) values (
      new.id,
      nullif(metadata ->> 'cnpj', ''),
      nullif(metadata ->> 'segment', ''),
      nullif(metadata ->> 'employee_count', ''),
      nullif(metadata ->> 'responsible_name', ''),
      nullif(metadata ->> 'responsible_role', ''),
      nullif(metadata ->> 'responsible_email', ''),
      nullif(metadata ->> 'responsible_phone', ''),
      nullif(metadata ->> 'description', ''),
      case
        when jsonb_typeof(metadata -> 'needs') = 'array'
          then array(select jsonb_array_elements_text(metadata -> 'needs'))
        else '{}'::text[]
      end
    );
  end if;

  -- Keep sensitive registration fields out of future JWT user_metadata claims.
  -- Authorization never trusts this metadata; the immutable database role is used.
  update auth.users
  set raw_user_meta_data = jsonb_build_object(
    'role', requested_role,
    'display_name', coalesce(
      nullif(metadata ->> 'display_name', ''),
      nullif(metadata ->> 'full_name', ''),
      nullif(metadata ->> 'name', ''),
      ''
    )
  )
  where id = new.id;

  return new;
end;
$$;
