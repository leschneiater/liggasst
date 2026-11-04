-- LiggaSST: feature 3 do plano Empresa pago - capacitacao da equipe.
--
-- A empresa pagante cadastra seus funcionarios (por e-mail), atribui os
-- treinamentos publicados da plataforma a eles e acompanha quem concluiu.
-- O funcionario entra com CONTA PROPRIA (papel novo 'employee'): ve apenas
-- os treinamentos atribuidos a ele e marca a conclusao. A emissao do
-- certificado fica para a infra de certificados (etapa separada); o ponto
-- de acoplamento e a RPC public.concluir_treinamento_equipe.
--
-- Aplicar com `supabase db push` ou colar no SQL editor do Supabase.

-- 1) Papel novo 'employee' em profiles.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('professional', 'company', 'admin', 'employee'));

-- handle_new_user: cadastro com e-mail/senha ja nasce aprovado; employee
-- nao gera linha em professionals nem em companies.
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
    'display_name', coalesce(metadata ->> 'display_name', '')
  )
  where id = new.id;

  return new;
end;
$$;

-- Conclusao de cadastro OAuth: employee tambem e papel valido.
create or replace function private.profiles_sensitive_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  conclusao_valida boolean;
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    conclusao_valida := old.verification_status = 'awaiting_completion'
      and new.verification_status = 'approved'
      and new.role in ('professional', 'company', 'employee')
      and new.is_test is not distinct from old.is_test
      and not exists (
        select 1 from public.messages m
        where m.sender_id = old.id or m.receiver_id = old.id)
      and not exists (
        select 1 from public.demands d where d.company_id = old.id)
      and not exists (
        select 1 from public.contracts c
        where c.company_id = old.id or c.professional_id = old.id);
    if not conclusao_valida then
      if new.role is distinct from old.role then
        raise exception 'role somente operacao administrativa';
      end if;
      if new.verification_status is distinct from old.verification_status then
        raise exception 'verification_status somente operacao administrativa';
      end if;
      if new.is_test is distinct from old.is_test then
        raise exception 'is_test somente operacao administrativa';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Linhas de detalhe coerentes com o papel concluido: employee nao tem
-- linha em professionals nem em companies.
create or replace function private.profiles_conclusao_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verification_status = 'awaiting_completion'
     and new.verification_status = 'approved' then
    if new.role = 'company' then
      delete from public.professionals pr where pr.profile_id = new.id;
      insert into public.companies (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
    elsif new.role = 'employee' then
      delete from public.professionals pr where pr.profile_id = new.id;
      delete from public.companies c where c.profile_id = new.id;
    else
      delete from public.companies c where c.profile_id = new.id;
      insert into public.professionals (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.completar_cadastro(
  p_role text,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rows int;
begin
  if v_uid is null then
    raise exception 'usuario nao autenticado';
  end if;
  if p_role not in ('professional', 'company', 'employee') then
    raise exception 'papel invalido';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'nome obrigatorio';
  end if;

  update public.profiles p set
    role = p_role,
    display_name = trim(p_display_name),
    verification_status = 'approved',
    updated_at = now()
  where p.id = v_uid
    and p.verification_status = 'awaiting_completion';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'cadastro ja concluido ou conta nao elegivel';
  end if;
end;
$$;

-- 2) Equipe da empresa: um funcionario e identificado pelo e-mail; o
-- vinculo com a conta dele (employee_profile_id) acontece sozinho quando a
-- conta existe ou quando ele se cadastra (triggers abaixo).

create table public.company_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  employee_profile_id uuid references public.profiles(id) on delete set null,
  email text not null check (position('@' in email) > 1),
  display_name text not null default '',
  active boolean not null default true,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create index company_employees_profile_idx
  on public.company_employees (employee_profile_id) where employee_profile_id is not null;

-- 3) Atribuicoes de treinamento. O funcionario so CONCLUI (via RPC); quem
-- atribui, desatribui e reabre e a empresa.

create table public.team_training_assignments (
  id uuid primary key default gen_random_uuid(),
  company_employee_id uuid not null references public.company_employees(id) on delete cascade,
  training_id uuid not null references public.trainings(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'completed')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_employee_id, training_id)
);

create index team_training_assignments_training_idx
  on public.team_training_assignments (training_id);

drop trigger if exists company_employees_set_updated_at on public.company_employees;
create trigger company_employees_set_updated_at before update on public.company_employees
  for each row execute function private.set_updated_at();

drop trigger if exists team_training_assignments_set_updated_at on public.team_training_assignments;
create trigger team_training_assignments_set_updated_at before update on public.team_training_assignments
  for each row execute function private.set_updated_at();

-- Vinculo automatico por e-mail (sempre em minusculas), nos dois sentidos:
-- conta employee nova encontra convites pendentes; convite novo encontra
-- conta employee existente.
create or replace function private.vincular_convites_funcionario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'employee' then
    update public.company_employees ce
    set employee_profile_id = new.id
    where lower(ce.email) = lower(new.email)
      and ce.employee_profile_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_vincular_convites on public.profiles;
create trigger profiles_vincular_convites
  after insert on public.profiles
  for each row execute function private.vincular_convites_funcionario();

create or replace function private.vincular_conta_existente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.employee_profile_id is null then
    update public.company_employees ce
    set employee_profile_id = p.id
    from public.profiles p
    where ce.id = new.id
      and lower(p.email) = lower(new.email)
      and p.role = 'employee';
  end if;
  return new;
end;
$$;

drop trigger if exists company_employees_vincular_conta on public.company_employees;
create trigger company_employees_vincular_conta
  after insert on public.company_employees
  for each row execute function private.vincular_conta_existente();

-- 4) Grants e RLS.

revoke all on public.company_employees from public, anon, authenticated;
revoke all on public.team_training_assignments from public, anon, authenticated;
grant select, insert, update, delete on public.company_employees to authenticated;
grant select, insert, delete on public.team_training_assignments to authenticated;

alter table public.company_employees enable row level security;
alter table public.team_training_assignments enable row level security;

-- Empresa: a equipe e das 3 features do plano Empresa pago, entao inserir
-- exige conta empresa pagante (mesma janela de private.plano_da_conta).
-- Ler o historico e desativar/desvincular seguem abertos a empresa dona.
drop policy if exists company_employees_company_select on public.company_employees;
create policy company_employees_company_select on public.company_employees
  for select to authenticated
  using (company_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists company_employees_company_insert on public.company_employees;
create policy company_employees_company_insert on public.company_employees
  for insert to authenticated
  with check (
    company_id = (select auth.uid())
    and (select private.plano_da_conta((select auth.uid()))) <> 'free'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'company'
    )
  );

drop policy if exists company_employees_company_update on public.company_employees;
create policy company_employees_company_update on public.company_employees
  for update to authenticated
  using (company_id = (select auth.uid()))
  with check (company_id = (select auth.uid()));

drop policy if exists company_employees_company_delete on public.company_employees;
create policy company_employees_company_delete on public.company_employees
  for delete to authenticated
  using (company_id = (select auth.uid()));

-- Funcionario: le apenas a(s) propria(s) linha(s), para saber a que
-- empresa(s) esta vinculado. Nenhuma escrita.
drop policy if exists company_employees_self_select on public.company_employees;
create policy company_employees_self_select on public.company_employees
  for select to authenticated
  using (employee_profile_id = (select auth.uid()));

-- Atribuicoes: empresa dona da equipe gerencia; funcionario (ativo) le as
-- suas. Sem update por ninguem: a conclusao passa pela RPC.
drop policy if exists team_assignments_company_select on public.team_training_assignments;
create policy team_assignments_company_select on public.team_training_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.company_employees e
      where e.id = company_employee_id
        and (e.company_id = (select auth.uid()) or (select private.is_admin()))
    )
  );

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
    and exists (
      select 1 from public.trainings t
      where t.id = training_id and t.status = 'published'
    )
  );

drop policy if exists team_assignments_company_delete on public.team_training_assignments;
create policy team_assignments_company_delete on public.team_training_assignments
  for delete to authenticated
  using (
    exists (
      select 1 from public.company_employees e
      where e.id = company_employee_id and e.company_id = (select auth.uid())
    )
  );

drop policy if exists team_assignments_employee_select on public.team_training_assignments;
create policy team_assignments_employee_select on public.team_training_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.company_employees e
      where e.id = company_employee_id
        and e.employee_profile_id = (select auth.uid())
        and e.active
    )
  );

-- O funcionario ve os treinamentos atribuidos a ele (publicados), enquanto
-- a empresa for pagante. Isso complementa trainings_member_select, que
-- cobre company/professional com plano proprio.
drop policy if exists trainings_employee_select on public.trainings;
create policy trainings_employee_select on public.trainings for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.team_training_assignments a
      join public.company_employees e on e.id = a.company_employee_id
      join public.profiles p on p.id = (select auth.uid())
      where e.employee_profile_id = (select auth.uid())
        and e.active
        and a.training_id = trainings.id
        and (trainings.is_test = false or p.is_test)
        and (select private.plano_da_conta(e.company_id)) <> 'free'
    )
  );

-- 5) RPC de conclusao: o funcionario marca o proprio treinamento como
-- concluido. PONTO DE ACOPLAMENTO DO CERTIFICADO: quando a infra de
-- avaliacao + certificado entrar (etapa separada), a emissao sera
-- acionada aqui, apos a marcacao.
create or replace function public.concluir_treinamento_equipe(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rows int;
begin
  if v_uid is null then
    raise exception 'usuario nao autenticado';
  end if;

  update public.team_training_assignments a
  set status = 'completed', completed_at = now(), updated_at = now()
  from public.company_employees e
  where a.id = p_assignment_id
    and e.id = a.company_employee_id
    and e.employee_profile_id = v_uid
    and e.active
    and a.status = 'assigned';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'atribuicao nao encontrada ou ja concluida';
  end if;
end;
$$;

revoke all on function public.concluir_treinamento_equipe(uuid) from public, anon;
grant execute on function public.concluir_treinamento_equipe(uuid) to authenticated;

-- 6) Acesso do funcionario ao PDF via Edge Function training-file-url: a
-- funcao chama esta RPC com a chave de servico (auth.uid() nulo), por isso
-- o id do funcionario vem por parametro; um usuario autenticado comum so
-- consulta o proprio acesso.
create or replace function public.equipe_treinamento_acesso(
  p_training_id uuid,
  p_employee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is not null and (select auth.uid()) <> p_employee_id then false
    else exists (
      select 1
      from public.team_training_assignments a
      join public.company_employees e on e.id = a.company_employee_id
      where e.employee_profile_id = p_employee_id
        and e.active
        and a.training_id = p_training_id
        and (select private.plano_da_conta(e.company_id)) <> 'free'
    )
  end;
$$;

revoke all on function public.equipe_treinamento_acesso(uuid, uuid) from public, anon;
grant execute on function public.equipe_treinamento_acesso(uuid, uuid) to authenticated;
