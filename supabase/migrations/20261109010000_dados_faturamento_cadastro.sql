-- LiggaSST: dados de faturamento coletados no cadastro (desde 05/11)
--
-- Motivo: a tela de assinatura precisa dos dados do cliente completos para
-- criar/reusar o customer no Asaas e a pagina hospedada vir preenchida.
-- Antes esses dados eram digitados so na hora da assinatura e iam apenas ao
-- Asaas; agora passam a ser coletados no cadastro e guardados no nosso banco
-- (politica de privacidade itens 2.1 e 2.4 atualizadas; retencao/exclusao
-- em cascata com a conta, item 7).
--
-- Onde guardar: reaproveita colunas existentes (profiles.phone/postal_code/
-- address, professionals.cpf, companies.cnpj) e adiciona 2 colunas novas em
-- profiles (address_number, province). Sem tabela nova. RLS dessas tabelas
-- ja e "dono ou admin"; grants por coluna atualizados apenas para o dono
-- editar os proprios dados de faturamento.

alter table public.profiles add column if not exists address_number text;
alter table public.profiles add column if not exists province text;

-- O dono edita os proprios dados de faturamento (a tela de assinatura grava
-- correcoes). Mesmo modelo das colunas existentes (grant por coluna,
-- 20260903190000).
grant update (address_number, province) on public.profiles to authenticated;

-- handle_new_user recriado a partir da versao mais recente
-- (20261108110000_fix_contrato_oauth_regressoes), somando os 2 campos novos
-- vindos dos metadados do cadastro. O restante permanece identico.
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
    address_number, province,
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
    nullif(metadata ->> 'address_number', ''),
    nullif(metadata ->> 'province', ''),
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

-- completar_cadastro: conclusao de conta OAuth passa a exigir os dados de
-- faturamento (desde 05/11), com a mesma validacao do formulario de
-- assinatura. A assinatura antiga (text, text) e removida: o app foi
-- atualizado junto e qualquer chamada velha falha em tempo de chamada, sem
-- efeito parcial.
create or replace function public.completar_cadastro(
  p_role text,
  p_display_name text,
  p_cpf_cnpj text,
  p_phone text,
  p_postal_code text,
  p_address text,
  p_address_number text,
  p_province text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rows int;
  v_doc text := regexp_replace(coalesce(p_cpf_cnpj, ''), '\D', '', 'g');
  v_fone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
begin
  if v_uid is null then
    raise exception 'usuario nao autenticado';
  end if;
  if p_role not in ('professional', 'company') then
    raise exception 'papel invalido';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'nome obrigatorio';
  end if;
  if p_role = 'professional' and length(v_doc) <> 11 then
    raise exception 'cpf invalido';
  end if;
  if p_role = 'company' and length(v_doc) <> 14 then
    raise exception 'cnpj invalido';
  end if;
  if length(v_fone) < 10 or length(v_fone) > 11 then
    raise exception 'celular invalido';
  end if;
  if length(v_cep) <> 8 then
    raise exception 'cep invalido';
  end if;
  if coalesce(trim(p_address), '') = '' then
    raise exception 'endereco obrigatorio';
  end if;
  if coalesce(trim(p_address_number), '') = '' then
    raise exception 'numero obrigatorio';
  end if;
  if coalesce(trim(p_province), '') = '' then
    raise exception 'bairro obrigatorio';
  end if;

  update public.profiles p set
    role = p_role,
    display_name = trim(p_display_name),
    phone = trim(p_phone),
    postal_code = trim(p_postal_code),
    address = trim(p_address),
    address_number = trim(p_address_number),
    province = trim(p_province),
    verification_status = 'approved',
    updated_at = now()
  where p.id = v_uid
    and p.verification_status = 'awaiting_completion';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'cadastro ja concluido ou conta nao elegivel';
  end if;

  if p_role = 'professional' then
    update public.professionals set cpf = trim(p_cpf_cnpj) where profile_id = v_uid;
  else
    update public.companies set cnpj = trim(p_cpf_cnpj) where profile_id = v_uid;
  end if;
end;
$$;

drop function if exists public.completar_cadastro(text, text);

revoke all on function public.completar_cadastro(text, text, text, text, text, text, text, text) from public;
revoke all on function public.completar_cadastro(text, text, text, text, text, text, text, text) from anon;
revoke all on function public.completar_cadastro(text, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.completar_cadastro(text, text, text, text, text, text, text, text) to authenticated;
