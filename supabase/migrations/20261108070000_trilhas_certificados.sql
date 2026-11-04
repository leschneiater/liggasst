-- Etapa 1 das trilhas com certificado (pedido dela 04/11/2026): estrutura
-- de trilhas, secoes e curadores. SEM mudanca visivel: so tabelas, RLS e
-- o seed do curador. Provas e certificados chegam nas proximas etapas;
-- content_type 'ebook' fica reservado para a etapa 4 (nenhuma secao ebook
-- agora).

-- ------------------------------------------------------------
-- 1) Trilhas
-- ------------------------------------------------------------
create table public.trails (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  audience text not null default 'both' check (audience in ('company', 'professional', 'both')),
  kind text not null check (kind in ('certified', 'open')),
  published boolean not null default false,
  is_test boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trails_set_updated_at before update on public.trails
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------
-- 2) Secoes da trilha (conteudo em ordem)
-- ------------------------------------------------------------
create table public.trail_sections (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails(id) on delete cascade,
  ordem integer not null default 0,
  titulo text not null,
  content_type text not null check (content_type in ('youtube', 'link', 'pdf', 'ebook')),
  -- Referencia do conteudo: pdf guarda o path no storage (<uuid>.pdf,
  -- mesmo formato dos treinamentos); youtube/link/ebook guardam URL http(s).
  conteudo text not null check (
    (content_type = 'pdf' and conteudo ~ '^[0-9a-fA-F-]{36}\.pdf$')
    or (content_type in ('youtube', 'link', 'ebook') and conteudo ~ '^https?://')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trail_sections_trail_idx on public.trail_sections (trail_id, ordem);

create trigger trail_sections_set_updated_at before update on public.trail_sections
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------
-- 3) Curadores (registro profissional so o admin ve e edita; coletado por
-- canal seguro, nunca por chat)
-- ------------------------------------------------------------
create table public.curators (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  qualificacao text not null default '',
  registro text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger curators_set_updated_at before update on public.curators
  for each row execute function private.set_updated_at();

-- Seed do primeiro curador; numero de registro pendente (placeholder).
insert into public.curators (nome, qualificacao, registro)
values ('Fábio Gentil', 'Técnico de Segurança do Trabalho', null);

-- ------------------------------------------------------------
-- 4) Junction trilha <-> curadores (varios curadores por trilha)
-- ------------------------------------------------------------
create table public.trail_curators (
  trail_id uuid not null references public.trails(id) on delete cascade,
  curator_id uuid not null references public.curators(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trail_id, curator_id)
);

-- ------------------------------------------------------------
-- 5) Grants e RLS (mesmo espelho de Radar/trainings):
--    leitura so de trilha publicada, para membro aprovado e PAGANTE
--    (private.plano_da_conta), do publico certo; linhas is_test so para
--    perfis de teste; escrita so admin.
-- ------------------------------------------------------------
revoke all on public.trails from public, anon, authenticated;
revoke all on public.trail_sections from public, anon, authenticated;
revoke all on public.curators from public, anon, authenticated;
revoke all on public.trail_curators from public, anon, authenticated;
grant select on public.trails to authenticated;
grant select on public.trail_sections to authenticated;
grant select on public.curators to authenticated;
grant select on public.trail_curators to authenticated;
grant insert, update, delete on public.trails to authenticated;
grant insert, update, delete on public.trail_sections to authenticated;
grant insert, update, delete on public.curators to authenticated;
grant insert, update, delete on public.trail_curators to authenticated;

alter table public.trails enable row level security;
alter table public.trail_sections enable row level security;
alter table public.curators enable row level security;
alter table public.trail_curators enable row level security;

-- Visibilidade de trilha publicada para membro pagante, reutilizavel nas
-- policies das 4 tabelas sem cruzar RLS entre elas (security definer, como
-- private.training_publicada): nenhuma policy de trilha consulta outra
-- tabela com RLS ligada.
create or replace function private.trail_visivel(p_trail uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trails t
    join public.profiles p on p.id = (select auth.uid())
    where t.id = p_trail
      and t.published
      and p.verification_status = 'approved'
      and (select private.plano_da_conta((select auth.uid()))) <> 'free'
      and (not t.is_test or p.is_test)
      and (
        t.audience = 'both'
        or (t.audience = 'company' and p.role = 'company')
        or (t.audience = 'professional' and p.role = 'professional')
      )
  );
$$;

revoke all on function private.trail_visivel(uuid) from public;
grant execute on function private.trail_visivel(uuid) to authenticated;

create policy trails_membro_select on public.trails
  for select to authenticated
  using ((select private.trail_visivel(id)));

create policy trails_admin_all on public.trails
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy trail_sections_membro_select on public.trail_sections
  for select to authenticated
  using ((select private.trail_visivel(trail_id)));

create policy trail_sections_admin_all on public.trail_sections
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Curador aparece quando cura ao menos uma trilha visivel ao membro.
create policy curators_membro_select on public.curators
  for select to authenticated
  using (
    ativo
    and exists (
      select 1 from public.trail_curators tc
      where tc.curator_id = curators.id
        and (select private.trail_visivel(tc.trail_id))
    )
  );

create policy curators_admin_all on public.curators
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy trail_curators_membro_select on public.trail_curators
  for select to authenticated
  using ((select private.trail_visivel(trail_id)));

create policy trail_curators_admin_all on public.trail_curators
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
