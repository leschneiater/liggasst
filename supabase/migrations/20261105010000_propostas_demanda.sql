-- Propostas de profissionais em demandas (base do comparador do plano
-- Empresa). A proposta convive com o chat livre (decisao da dona em
-- 04/11/2026): nao substitui nem bloqueia a conversa.
-- O gate pago do comparador em si fica no app (aviso no plano gratuito);
-- a leitura das propostas pela empresa dona da demanda fica aberta aqui
-- para que o aviso possa mostrar a contagem real.

create table if not exists public.demand_proposals (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  professional_id uuid not null references public.professionals(profile_id) on delete cascade,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  deadline_days integer check (deadline_days is null or deadline_days > 0),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- uma proposta por profissional por demanda; reenviar = conversar no chat
  unique (demand_id, professional_id)
);

alter table public.demand_proposals enable row level security;

drop trigger if exists demand_proposals_set_updated_at on public.demand_proposals;
create trigger demand_proposals_set_updated_at before update on public.demand_proposals
  for each row execute function private.set_updated_at();

-- Profissional cria a propria proposta, e so em demanda ainda ativa.
drop policy if exists demand_proposals_professional_insert on public.demand_proposals;
create policy demand_proposals_professional_insert on public.demand_proposals for insert to authenticated
  with check (
    professional_id = (select auth.uid())
    and exists (
      select 1 from public.demands d
      where d.id = demand_id and d.status = 'active'
    )
  );

-- Profissional le as proprias propostas; empresa le as propostas das
-- proprias demandas. Admin le tudo.
drop policy if exists demand_proposals_select on public.demand_proposals;
create policy demand_proposals_select on public.demand_proposals for select to authenticated
  using (
    professional_id = (select auth.uid())
    or exists (
      select 1 from public.demands d
      where d.id = demand_id and d.company_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

-- Empresa aceita/recusa propostas das proprias demandas (so status muda
-- pelo app; o cliente filtra os campos, a policy reforca o dono).
drop policy if exists demand_proposals_company_update on public.demand_proposals;
create policy demand_proposals_company_update on public.demand_proposals for update to authenticated
  using (
    exists (
      select 1 from public.demands d
      where d.id = demand_id and d.company_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.demands d
      where d.id = demand_id and d.company_id = (select auth.uid())
    )
  );

-- Profissional retira a propria proposta enquanto pendente.
drop policy if exists demand_proposals_professional_update on public.demand_proposals;
create policy demand_proposals_professional_update on public.demand_proposals for update to authenticated
  using (professional_id = (select auth.uid()) and status = 'pending')
  with check (professional_id = (select auth.uid()));
