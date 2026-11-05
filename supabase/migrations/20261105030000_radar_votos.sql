-- Votos de relevancia dos artigos do Radar TST (joia / nao joia), um por
-- pessoa por artigo, trocavel a qualquer momento. As contagens ficam para
-- a administracao; o assinante so ve os proprios botoes.

create table if not exists public.radar_votos (
  post_id uuid not null references public.radar_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  voto text not null check (voto in ('joia', 'nao_joia')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.radar_votos enable row level security;

-- Leitura: cada um ve o proprio voto; admin ve todos (resumo no admin).
create policy radar_votos_select on public.radar_votos for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

-- Votar exige acesso pago pela REGRA UNICA (cortesia incluida) e so vale
-- em artigo publicado e ja no ar. A subquery em radar_posts herda a RLS
-- do votante: sem acesso de leitura ao artigo, o exists falha tambem.
create policy radar_votos_insert on public.radar_votos for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and private.plano_da_conta((select auth.uid())) <> 'free'
    and exists (
      select 1 from public.radar_posts p
      where p.id = post_id
        and p.status = 'publicado'
        and p.publicado_em <= now()
    )
  );

-- Trocar ou retirar o voto: so a propria linha.
create policy radar_votos_update on public.radar_votos for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy radar_votos_delete on public.radar_votos for delete
  to authenticated
  using (profile_id = (select auth.uid()));

revoke all on public.radar_votos from public, anon;
grant select, insert, update, delete on public.radar_votos to authenticated;
