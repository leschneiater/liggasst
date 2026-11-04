-- Aba admin "Acessos" + cortesia de acesso pago (decisoes dela em 04/11/2026):
-- (a) cortesia vale como plano pago COM destaque e SEM anuncios (mesma regra
-- unica, private.plano_da_conta); (b) prazo opcional; (c) a pessoa NAO ve
-- indicacao de cortesia - aparece como assinante normal; (d) no admin a
-- lista mostra o selo "Cortesia" e o motivo so no detalhe; (e) aba "Acessos".
-- Nada e gravado em subscriptions nem no Asaas: cortesia nunca gera cobranca.

create table if not exists public.cortesias (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null check (length(trim(motivo)) >= 3),
  concedida_por uuid not null references public.profiles(id),
  concedida_em timestamptz not null default now(),
  valida_ate date,
  revogada_por uuid references public.profiles(id),
  revogada_em timestamptz
);

-- So uma cortesia ativa por pessoa.
create unique index if not exists cortesias_uma_ativa
  on public.cortesias (profile_id) where revogada_em is null;

alter table public.cortesias enable row level security;

-- Cada um le apenas a propria cortesia (cliente usa para liberar o acesso);
-- admin le tudo. Escrita SOMENTE via RPCs admin abaixo (auditoria).
create policy cortesias_select_propria
  on public.cortesias for select
  to authenticated
  using (profile_id = (select auth.uid()) or private.is_admin());

revoke all on public.cortesias from public;
grant select on public.cortesias to authenticated;

-- Cortesia ativa: nao revogada e dentro do prazo (ou sem prazo).
create or replace function private.cortesia_ativa(a uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cortesias c
    where c.profile_id = a
      and c.revogada_em is null
      and (c.valida_ate is null or c.valida_ate >= current_date)
  );
$$;

revoke all on function private.cortesia_ativa(uuid) from public;

-- Regra unica de acesso pago: assinatura pro vigente (producao) OU cortesia
-- ativa. A cortesia devolve o plano pro do PAPEL da pessoa, entao destaque,
-- Radar, Capacitacao e o gate de anuncios seguem juntos, sem excecao.
create or replace function private.plano_da_conta(a uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.plan
      from public.subscriptions s
      where s.profile_id = a
        and s.plan in ('pro_professional', 'pro_company')
        and (
          s.status = 'active'
          or (s.status in ('canceled', 'past_due')
              and s.current_period_end >= current_date)
        )
        and s.environment = 'production'
      limit 1
    ),
    (
      select case p.role when 'company' then 'pro_company' else 'pro_professional' end
      from public.profiles p
      where p.id = a and private.cortesia_ativa(a)
    ),
    'free'
  );
$$;

revoke all on function private.plano_da_conta(uuid) from public;
grant execute on function private.plano_da_conta(uuid) to authenticated;

-- Plano efetivo da conta logada, mesma regra unica. O cliente usa quando a
-- assinatura da tabela nao esta paga-ativa: se vier pro_*, ha cortesia e o
-- acesso e liberado exatamente como assinante (sem indicacao de cortesia).
create or replace function public.plano_efetivo()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.plano_da_conta((select auth.uid()));
$$;

revoke all on function public.plano_efetivo() from public;
grant execute on function public.plano_efetivo() to authenticated;

-- Lista da aba Acessos (so admin): plano atual, ultimo acesso, dias ativos
-- 30d e selo de cortesia. Perfis de teste ficam fora (mesma regra do Painel).
create or replace function public.admin_listar_acessos()
returns table (
  profile_id uuid,
  display_name text,
  email text,
  role text,
  plano text,
  ultimo_acesso date,
  dias_ativos_30d integer,
  cortesia_ativa boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.email, p.role,
         private.plano_da_conta(p.id),
         (select max(a.dia) from public.acesso_diario a where a.user_id = p.id),
         coalesce((select count(*)::integer from public.acesso_diario a
                   where a.user_id = p.id and a.dia >= current_date - 29), 0),
         private.cortesia_ativa(p.id)
  from public.profiles p
  where private.is_admin()
    and p.is_test is not true
  order by p.created_at desc;
$$;

revoke all on function public.admin_listar_acessos() from public;
grant execute on function public.admin_listar_acessos() to authenticated;

-- Conceder cortesia (so admin; registra quem e quando). Se ja houver uma
-- ativa, ela e revogada e substituida pela nova (mantem 1 ativa por pessoa).
create or replace function public.admin_conceder_cortesia(
  p_profile uuid, p_motivo text, p_valida_ate date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  novo_id uuid;
begin
  if not private.is_admin() then
    raise exception 'apenas admin';
  end if;
  if p_valida_ate is not null and p_valida_ate < current_date then
    raise exception 'data fim no passado';
  end if;
  update public.cortesias
     set revogada_em = now(), revogada_por = (select auth.uid())
   where profile_id = p_profile and revogada_em is null;
  insert into public.cortesias (profile_id, motivo, concedida_por, valida_ate)
  values (p_profile, trim(p_motivo), (select auth.uid()), p_valida_ate)
  returning id into novo_id;
  return novo_id;
end;
$$;

revoke all on function public.admin_conceder_cortesia(uuid, text, date) from public;
grant execute on function public.admin_conceder_cortesia(uuid, text, date) to authenticated;

-- Revogar cortesia (so admin; registra quem e quando).
create or replace function public.admin_revogar_cortesia(p_cortesia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'apenas admin';
  end if;
  update public.cortesias
     set revogada_em = now(), revogada_por = (select auth.uid())
   where id = p_cortesia and revogada_em is null;
end;
$$;

revoke all on function public.admin_revogar_cortesia(uuid) from public;
grant execute on function public.admin_revogar_cortesia(uuid) to authenticated;
