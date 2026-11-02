-- Assinatura: registro de plano por conta (versao de testes, sandbox Asaas).
-- Nada aqui cobra ninguem: e so o registro de estado que o webhook do Asaas
-- (edge function asaas-webhook) mantem. Limites e telas vem em passos proprios.
--
-- POLITICA PENDENTE DE DECISAO DA DONA (default conservador implementado):
-- - cancelamento da assinatura MANTEM o plano ate current_period_end;
-- - estorno/chargeback do pagamento do periodo CORRENTE revoga na hora;
-- - estorno de pagamento de periodo ANTIGO nao derruba o periodo corrente.

create table if not exists public.subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'pro_professional', 'pro_company')),
  status text not null default 'active'
    check (status in ('active', 'pending_first_payment', 'past_due', 'canceled', 'refunded', 'chargeback')),
  current_period_end date,
  asaas_customer_id text,
  asaas_checkout_id text,
  asaas_subscription_id text,
  last_paid_payment_id text,
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Leitura propria via PostgREST (o app mostra o plano da conta logada);
-- escrita nao e concedida: so service role (webhook/conciliador).
grant select on public.subscriptions to authenticated;

-- A conta le o proprio plano; ninguem le o de terceiros.
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (profile_id = auth.uid());
-- Sem policy de insert/update/delete para authenticated:
-- escrita so via service role (webhook Asaas + conciliador).

-- Periodos pagos por cobranca: estorno de cobranca antiga nao derruba o
-- periodo corrente (regra coberta por teste).
create table if not exists public.subscription_payments (
  asaas_payment_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  asaas_subscription_id text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'paid'
    check (status in ('paid', 'refunded', 'chargeback')),
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'production')),
  created_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;
-- Tabela interna do webhook/conciliador: sem policies para authenticated.

-- Idempotencia + auditoria de webhooks: todo evento registrado antes de
-- aplicar; evento repetido nao reaplica.
create table if not exists public.asaas_webhook_events (
  event_key text primary key,
  event_type text not null,
  payload jsonb not null,
  applied boolean not null default false,
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'production')),
  received_at timestamptz not null default now()
);

alter table public.asaas_webhook_events enable row level security;
-- Auditoria interna: sem policies para authenticated.

-- Toda conta nova comeca gratuita. Trigger proprio em public.profiles (sem
-- tocar na private.handle_new_user, que cuida do cadastro).
create or replace function private.handle_new_profile_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end $$;

drop trigger if exists on_profile_created_subscription on public.profiles;
create trigger on_profile_created_subscription
  after insert on public.profiles
  for each row execute function private.handle_new_profile_subscription();
