-- LiggaSST: aprovacao automatica de cadastros para aparecer nas buscas
-- Decisao da proprietaria (29/10/2026): novos cadastros entram aprovados,
-- sem revisao manual. Isto e VISIBILIDADE automatica nas buscas; nao
-- representa validacao de credenciais, documentos ou certificados.
-- Aplicar com `supabase db push` ou colar no SQL editor do Supabase.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  metadata jsonb;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
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
    coalesce(metadata ->> 'display_name', ''),
    nullif(metadata ->> 'phone', ''),
    nullif(metadata ->> 'postal_code', ''),
    nullif(metadata ->> 'city', ''),
    case
      when upper(coalesce(metadata ->> 'state', '')) ~ '^[A-Z]{2}$'
        then upper(metadata ->> 'state')
      else null
    end,
    nullif(metadata ->> 'address', ''),
    'approved'
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
    'display_name', coalesce(metadata ->> 'display_name', '')
  )
  where id = new.id;

  return new;
end;
$$;

-- Cadastros existentes passam a aparecer nas buscas (backfill unico).
update public.profiles
set verification_status = 'approved'
where verification_status = 'pending';
