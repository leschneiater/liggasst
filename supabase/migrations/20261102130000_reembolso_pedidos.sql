-- Pedidos de reembolso com decisao humana (admin) e execucao via Asaas.
-- PREPARADO, NAO APLICADO. Nada aqui executa estorno: quem executa e a edge
-- function asaas-reembolso, somente apos aprovacao da admin por pedido, com
-- valor e cobranca claros na tela. Nenhuma decisao legal automatica.
--
-- Idempotencia contra dupla devolucao (camadas):
-- 1) indice unico: no maximo um pedido ativo/executado por cobranca;
-- 2) transicao atomica pendente -> aprovado (duplo clique/concorrncia = 0 rows);
-- 3) antes de estornar, a function consulta estornos existentes no Asaas e
--    nunca cria outro se ja houver.

create table if not exists public.reembolso_pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  asaas_payment_id text not null references public.subscription_payments(asaas_payment_id) on delete cascade,
  valor numeric(10,2) check (valor is null or valor > 0),
  motivo text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'recusado', 'estorno_em_andamento', 'estornado', 'erro')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  detalhe text,
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'production'))
);

alter table public.reembolso_pedidos enable row level security;

grant select, insert on public.reembolso_pedidos to authenticated;

-- A conta cria e le os proprios pedidos; a admin le todos.
create policy "reembolso_pedidos_select"
  on public.reembolso_pedidos for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

-- subscription_payments nao tem policy de leitura para authenticated (tabela
-- interna). Esta funcao confirma que a cobranca pertence a conta, sem abrir a
-- tabela: evita pedir reembolso de cobranca de terceiros.
create or replace function private.cobranca_pertence_a_conta(p_payment text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscription_payments sp
    where sp.asaas_payment_id = p_payment
      and sp.profile_id = (select auth.uid())
      and sp.status = 'paid'
  );
$$;
revoke all on function private.cobranca_pertence_a_conta(text) from public;
grant execute on function private.cobranca_pertence_a_conta(text) to authenticated;

create policy "reembolso_pedidos_insert_own"
  on public.reembolso_pedidos for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pendente'
    and decided_by is null
    and decided_at is null
    and detalhe is null
    and private.cobranca_pertence_a_conta(asaas_payment_id)
  );

-- Sem update/delete para authenticated: decisao so via service role
-- (edge function asaas-reembolso) e webhook.

create unique index if not exists reembolso_pedidos_unico_ativo
  on public.reembolso_pedidos (asaas_payment_id)
  where status in ('pendente', 'aprovado', 'estorno_em_andamento', 'estornado');
