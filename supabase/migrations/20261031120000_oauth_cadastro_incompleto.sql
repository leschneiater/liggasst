-- LiggaSST: login social (Google/Microsoft) - primeiro acesso sem papel definido
--
-- Contexto: handle_new_user assume role 'professional' e verification_status
-- 'approved' quando a metadata do signup nao traz role. O cadastro por
-- e-mail+senha sempre envia role; o primeiro acesso via OAuth NAO envia,
-- entao nasceria um perfil vazio, aprovado e visivel na busca de
-- profissionais (search_professionals filtra apenas 'approved').
--
-- Ajuste:
-- 1) Novo status 'awaiting_completion' no check constraint de
--    verification_status. Sem role na metadata, o perfil nasce
--    'awaiting_completion': invisivel nas buscas e bloqueado em mensagens,
--    demandas e contratos (todos os gates exigem 'approved'), ate concluir
--    o cadastro via public.completar_cadastro (migracao 20261031120100).
--    Status dedicado, NAO o generico 'pending': 'pending' continua sendo
--    apenas o estado de aprovacao administrativa e nunca habilita a
--    conclusao por conta propria.
-- 2) display_name aproveita full_name/name enviados pelo provedor OAuth
--    (Google/Microsoft) quando display_name nao vier na metadata.
--
-- Cadastro por e-mail+senha (metadata com role) nao muda: nasce 'approved',
-- decisao de aprovacao automatica existente e mantida.
-- Reversivel: restaurar a definicao anterior de handle_new_user e o check
-- constraint anterior (sem 'awaiting_completion'), desde que nao existam
-- perfis com o novo status.

alter table public.profiles
  drop constraint if exists profiles_verification_status_check;
alter table public.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected', 'awaiting_completion'));

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
  tem_role := metadata ->> 'role' in ('professional', 'company');
  requested_role := case metadata ->> 'role'
    when 'company' then 'company'
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
  else
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
