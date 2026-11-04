-- Etapa 2 do modulo de trilhas (pedido dela 04/11/2026): progresso do membro
-- por secao e selos no perfil ao concluir uma trilha do tipo 'open'.
--
-- Regras (uma so fonte de verdade, aqui e na RLS):
-- - Progresso: o membro marca a propria secao como concluida; so ele ve o
--   proprio progresso; admin le tudo. Sem update/delete de progresso.
-- - Selo: nasce so pelo gatilho de conclusao (funcao security definer), para
--   trilha 'open' publicada, quando TODAS as secoes tem progresso. Par unico
--   (profile_id, trail_id): repetir a conclusao nao duplica o selo.
-- - Leitura de selos: o membro ve os proprios; autenticados veem selos de
--   perfis nao-teste; anonimos (vitrine publica) so via RPC
--   public.profile_badges_publico, que filtra perfis de teste (mesma regra
--   das outras vitrines publicas). Selos de perfis is_test nunca aparecem em
--   busca/vitrine. Ninguem insere/atualiza/apaga selo diretamente.

-- ---------------------------------------------------------------------------
-- Progresso por secao
-- ---------------------------------------------------------------------------
create table if not exists public.trail_section_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.trail_sections(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (profile_id, section_id)
);

create index if not exists trail_section_progress_profile_idx
  on public.trail_section_progress (profile_id);
create index if not exists trail_section_progress_section_idx
  on public.trail_section_progress (section_id);

alter table public.trail_section_progress enable row level security;

create policy trail_section_progress_select_own on public.trail_section_progress
  for select to authenticated
  using (profile_id = auth.uid());

create policy trail_section_progress_select_admin on public.trail_section_progress
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Insert so do proprio progresso; a secao precisa ser de trilha visivel para
-- o chamador (mesmo helper das policies de leitura de trilhas).
create policy trail_section_progress_insert_own on public.trail_section_progress
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.trail_sections s
      where s.id = section_id
        and private.trail_visivel(s.trail_id)
    )
  );

grant select, insert on public.trail_section_progress to authenticated;

-- ---------------------------------------------------------------------------
-- Selos do perfil
-- ---------------------------------------------------------------------------
create table if not exists public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trail_id uuid not null references public.trails(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (profile_id, trail_id)
);

create index if not exists profile_badges_profile_idx
  on public.profile_badges (profile_id);

alter table public.profile_badges enable row level security;

create policy profile_badges_select_own on public.profile_badges
  for select to authenticated
  using (profile_id = auth.uid());

-- Autenticados veem selos de perfis nao-teste (busca/vitrine logada). O
-- helper security definer evita a RLS de profiles (membro so le a propria
-- linha la) sem abrir profiles para ninguem.
create or replace function private.perfil_nao_teste(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile and p.is_test = false
  );
$$;

revoke all on function private.perfil_nao_teste(uuid) from public;
grant execute on function private.perfil_nao_teste(uuid) to authenticated;

create policy profile_badges_select_nao_teste on public.profile_badges
  for select to authenticated
  using ((select private.perfil_nao_teste(profile_id)));

create policy profile_badges_select_admin on public.profile_badges
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Sem policies de insert/update/delete: so a funcao de conclusao (security
-- definer, dona da tabela) escreve selos.
grant select on public.profile_badges to authenticated;

-- ---------------------------------------------------------------------------
-- Concessao automatica do selo ao concluir todas as secoes
-- ---------------------------------------------------------------------------
create or replace function private.conferir_selo_trilha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trail_id uuid;
  v_total integer;
  v_feitas integer;
begin
  select s.trail_id into v_trail_id
  from public.trail_sections s
  where s.id = new.section_id;

  -- Selo so existe para trilhas abertas publicadas.
  if not exists (
    select 1 from public.trails t
    where t.id = v_trail_id and t.kind = 'open' and t.published = true
  ) then
    return new;
  end if;

  select count(*) into v_total
  from public.trail_sections s
  where s.trail_id = v_trail_id;

  select count(distinct p.section_id) into v_feitas
  from public.trail_section_progress p
  join public.trail_sections s on s.id = p.section_id
  where p.profile_id = new.profile_id and s.trail_id = v_trail_id;

  if v_total > 0 and v_feitas >= v_total then
    insert into public.profile_badges (profile_id, trail_id)
    values (new.profile_id, v_trail_id)
    on conflict (profile_id, trail_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger trail_section_progress_conferir_selo
  after insert on public.trail_section_progress
  for each row execute function private.conferir_selo_trilha();

-- ---------------------------------------------------------------------------
-- Leitura publica (anonima) dos selos de um perfil, para a vitrine publica.
-- Mesma regra das outras vitrines: perfil de teste nunca aparece.
-- ---------------------------------------------------------------------------
create or replace function public.profile_badges_publico(p_profile_id uuid)
returns table (trail_id uuid, trail_titulo text, earned_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.trail_id, t.titulo, b.earned_at
  from public.profile_badges b
  join public.trails t on t.id = b.trail_id
  join public.profiles p on p.id = b.profile_id
  where b.profile_id = p_profile_id
    and p.is_test = false
    and t.kind = 'open'
  order by b.earned_at desc;
$$;

revoke all on function public.profile_badges_publico(uuid) from public;
grant execute on function public.profile_badges_publico(uuid) to anon, authenticated;

comment on table public.trail_section_progress is
  'Secoes concluidas por membro em trilhas. Escrita so do proprio membro (insert), leitura propria + admin.';
comment on table public.profile_badges is
  'Selos concedidos ao concluir trilhas abertas. Escrita apenas pelo fluxo de conclusao; leitura publica filtra perfis de teste.';
