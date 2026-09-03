-- LiggaSST: Supabase-only schema
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  role text not null default 'professional'
    check (role in ('professional', 'company', 'admin')),
  display_name text not null default '',
  phone text,
  postal_code text,
  city text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  address text,
  avatar_path text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professionals (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  cpf text,
  education text,
  specialization text,
  experience text,
  registration_number text,
  service_radius text,
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  availability text[] not null default '{}',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  cnpj text,
  segment text,
  employee_count text,
  responsible_name text,
  responsible_role text,
  responsible_email text,
  responsible_phone text,
  description text,
  needs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(profile_id) on delete cascade,
  title text not null,
  description text not null,
  service_type text,
  city text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  budget numeric(12, 2) check (budget is null or budget >= 0),
  deadline date,
  status text not null default 'active'
    check (status in ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid references public.demands(id) on delete set null,
  company_id uuid not null references public.companies(profile_id) on delete restrict,
  professional_id uuid not null references public.professionals(profile_id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  amount numeric(12, 2) check (amount is null or amount >= 0),
  starts_at date,
  ends_at date,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(profile_id) on delete cascade,
  name text not null,
  issuer text,
  issued_at date,
  expires_at date,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demands_company_id_idx on public.demands(company_id);
create index if not exists demands_status_idx on public.demands(status);
create index if not exists contracts_company_id_idx on public.contracts(company_id);
create index if not exists contracts_professional_id_idx on public.contracts(professional_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_receiver_id_idx on public.messages(receiver_id);
create index if not exists certificates_professional_id_idx on public.certificates(professional_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
    id, email, role, display_name, phone, postal_code, city, state, address
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
    nullif(metadata ->> 'address', '')
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

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function private.sync_user_email();

-- Backfill Supabase Auth accounts that existed before this migration.
insert into public.profiles (id, email, role, display_name)
select
  id,
  coalesce(email, ''),
  case raw_user_meta_data ->> 'role' when 'company' then 'company' else 'professional' end,
  coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

insert into public.professionals (profile_id)
select id from public.profiles where role = 'professional'
on conflict (profile_id) do nothing;

insert into public.companies (profile_id)
select id from public.profiles where role = 'company'
on conflict (profile_id) do nothing;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
drop trigger if exists professionals_set_updated_at on public.professionals;
create trigger professionals_set_updated_at before update on public.professionals
  for each row execute function private.set_updated_at();
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
drop trigger if exists demands_set_updated_at on public.demands;
create trigger demands_set_updated_at before update on public.demands
  for each row execute function private.set_updated_at();
drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function private.set_updated_at();
drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at before update on public.certificates
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.companies enable row level security;
alter table public.demands enable row level security;
alter table public.contracts enable row level security;
alter table public.messages enable row level security;
alter table public.certificates enable row level security;

revoke all on public.profiles, public.professionals, public.companies,
  public.demands, public.contracts, public.messages, public.certificates
  from anon, authenticated;

grant select on public.profiles, public.professionals, public.companies,
  public.demands, public.contracts, public.messages, public.certificates
  to authenticated;
grant update (display_name, phone, postal_code, city, state, address, avatar_path)
  on public.profiles to authenticated;
grant update (cpf, education, specialization, experience, registration_number,
  service_radius, hourly_rate, availability, description)
  on public.professionals to authenticated;
grant update (cnpj, segment, employee_count, responsible_name, responsible_role,
  responsible_email, responsible_phone, description, needs)
  on public.companies to authenticated;
grant insert, update on public.demands to authenticated;
grant insert on public.messages to authenticated;
grant update (read) on public.messages to authenticated;
grant insert on public.certificates to authenticated;
grant update (name, issuer, issued_at, expires_at, storage_path)
  on public.certificates to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists professionals_select on public.professionals;
create policy professionals_select on public.professionals for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists professionals_update on public.professionals;
create policy professionals_update on public.professionals for update to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()))
  with check (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies for update to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()))
  with check (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists demands_select on public.demands;
create policy demands_select on public.demands for select to authenticated
  using (
    company_id = (select auth.uid())
    or status = 'active'
    or (select private.is_admin())
  );
drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands for insert to authenticated
  with check (company_id = (select auth.uid()));
drop policy if exists demands_update on public.demands;
create policy demands_update on public.demands for update to authenticated
  using (company_id = (select auth.uid()) or (select private.is_admin()))
  with check (company_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated
  using (
    company_id = (select auth.uid())
    or professional_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or (select private.is_admin())
  );
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and receiver_id <> (select auth.uid()));
drop policy if exists messages_update_read on public.messages;
create policy messages_update_read on public.messages for update to authenticated
  using (receiver_id = (select auth.uid()) or (select private.is_admin()))
  with check (receiver_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates for select to authenticated
  using (professional_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates for insert to authenticated
  with check (professional_id = (select auth.uid()) and status = 'pending');
drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates for update to authenticated
  using (professional_id = (select auth.uid()) or (select private.is_admin()))
  with check (professional_id = (select auth.uid()) or (select private.is_admin()));

-- Safe, authenticated marketplace searches. Sensitive fields are intentionally omitted.
create or replace function public.search_professionals(
  p_state text default null,
  p_city text default null,
  p_specialization text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  education text,
  specialization text,
  experience text,
  service_radius text,
  hourly_rate numeric,
  availability text[],
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%');
$$;

create or replace function public.search_companies(
  p_state text default null,
  p_city text default null,
  p_segment text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  segment text,
  employee_count text,
  description text,
  needs text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, c.segment, c.employee_count, c.description, c.needs
  from public.profiles p
  join public.companies c on c.profile_id = p.id
  where p.verification_status = 'approved'
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%');
$$;

revoke all on function public.search_professionals(text, text, text) from public;
revoke all on function public.search_companies(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to authenticated;
grant execute on function public.search_companies(text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images', 'profile-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_owner_select on storage.objects;
create policy storage_owner_select on storage.objects for select to authenticated
  using (
    bucket_id in ('profile-images', 'documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists storage_owner_insert on storage.objects;
create policy storage_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('profile-images', 'documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists storage_owner_update on storage.objects;
create policy storage_owner_update on storage.objects for update to authenticated
  using (
    bucket_id in ('profile-images', 'documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('profile-images', 'documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists storage_owner_delete on storage.objects;
create policy storage_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('profile-images', 'documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
