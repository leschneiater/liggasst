-- Calendario de conformidade da empresa (v1: so metadados + validade, sem
-- upload de arquivo; decisao da dona em 04/11/2026). O gate do plano
-- Empresa pago fica no app (aviso no plano gratuito), como no comparador;
-- aqui o banco garante apenas que cada empresa mexa nos proprios itens.

create table if not exists public.compliance_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(profile_id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  tipo text not null default 'Outro' check (char_length(tipo) between 1 and 100),
  validade date not null,
  responsavel text check (responsavel is null or char_length(responsavel) <= 200),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compliance_items enable row level security;

create index if not exists compliance_items_company_id_idx on public.compliance_items(company_id);

drop trigger if exists compliance_items_set_updated_at on public.compliance_items;
create trigger compliance_items_set_updated_at before update on public.compliance_items
  for each row execute function private.set_updated_at();

-- Empresa le apenas os proprios itens; admin le tudo.
drop policy if exists compliance_items_select on public.compliance_items;
create policy compliance_items_select on public.compliance_items for select to authenticated
  using (company_id = (select auth.uid()) or (select private.is_admin()));

-- Empresa cria itens apenas para si.
drop policy if exists compliance_items_insert on public.compliance_items;
create policy compliance_items_insert on public.compliance_items for insert to authenticated
  with check (company_id = (select auth.uid()));

-- Empresa edita apenas os proprios itens.
drop policy if exists compliance_items_update on public.compliance_items;
create policy compliance_items_update on public.compliance_items for update to authenticated
  using (company_id = (select auth.uid()))
  with check (company_id = (select auth.uid()));

-- Empresa exclui apenas os proprios itens.
drop policy if exists compliance_items_delete on public.compliance_items;
create policy compliance_items_delete on public.compliance_items for delete to authenticated
  using (company_id = (select auth.uid()));
