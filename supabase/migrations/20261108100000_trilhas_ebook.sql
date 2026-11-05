-- Etapa 4 das trilhas (pedido dela 04/11/2026): ebook de revisao e
-- desbloqueio da nova tentativa. Regras aprovadas:
-- - um ebook por trilha 'certified', lido DENTRO do app em secoes
--   (content_type 'ebook', ja reservado); o curador escreve o texto e o
--   admin cria/edita as secoes;
-- - depois de uma reprovacao, nova tentativa so com o cadeado de 7 dias
--   vencido E o ebook lido ate o final (progresso de leitura por membro e
--   trilha, no servidor);
-- - trilha sem secoes de ebook: vale so o cadeado de 7 dias (comportamento
--   seguro combinado);
-- - gate pago e isolamento is_test como nas etapas anteriores; RLS: membro
--   le so o proprio progresso de leitura, admin le tudo.

-- ---------------------------------------------------------------------------
-- 1) Secao de ebook guarda TEXTO (nao URL): o conteudo e escrito pelo
--    curador e lido no app.
-- ---------------------------------------------------------------------------
-- O check original e table-level (cobre content_type e conteudo), entao o
-- nome gerado e trail_sections_check; derrubamos os dois nomes possiveis.
alter table public.trail_sections
  drop constraint if exists trail_sections_check;
alter table public.trail_sections
  drop constraint if exists trail_sections_conteudo_check;
alter table public.trail_sections
  add constraint trail_sections_conteudo_check check (
    (content_type = 'pdf' and conteudo ~ '^[0-9a-fA-F-]{36}\.pdf$')
    or (content_type in ('youtube', 'link') and conteudo ~ '^https?://')
    or (content_type = 'ebook' and length(trim(conteudo)) >= 3)
  );

-- ---------------------------------------------------------------------------
-- 2) Progresso de leitura do ebook (por membro e secao de ebook)
-- ---------------------------------------------------------------------------
create table public.trail_ebook_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.trail_sections(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (profile_id, section_id)
);

create index trail_ebook_progress_profile_idx on public.trail_ebook_progress (profile_id);
create index trail_ebook_progress_section_idx on public.trail_ebook_progress (section_id);

revoke all on public.trail_ebook_progress from public, anon, authenticated;
grant select on public.trail_ebook_progress to authenticated;

alter table public.trail_ebook_progress enable row level security;

create policy trail_ebook_progress_select_own on public.trail_ebook_progress
  for select to authenticated
  using (profile_id = auth.uid());

create policy trail_ebook_progress_select_admin on public.trail_ebook_progress
  for select to authenticated
  using ((select private.is_admin()));

-- Sem policies de insert/update/delete: so a RPC abaixo escreve.

-- ---------------------------------------------------------------------------
-- 3) Marcar secao de ebook como lida (servidor: so ebook de trilha visivel,
--    o que ja cobre gate pago e isolamento is_test)
-- ---------------------------------------------------------------------------
create or replace function public.trail_ebook_marcar_lida(p_section uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sec public.trail_sections%rowtype;
  v_total integer;
  v_lidas integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_autenticado');
  end if;

  select * into v_sec from public.trail_sections where id = p_section;
  if not found or v_sec.content_type <> 'ebook'
     or not private.trail_visivel(v_sec.trail_id) then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  insert into public.trail_ebook_progress (profile_id, section_id)
  values (v_uid, p_section)
  on conflict (profile_id, section_id) do nothing;

  select count(*) into v_total
  from public.trail_sections
  where trail_id = v_sec.trail_id and content_type = 'ebook';
  select count(distinct p.section_id) into v_lidas
  from public.trail_ebook_progress p
  join public.trail_sections s on s.id = p.section_id
  where p.profile_id = v_uid and s.trail_id = v_sec.trail_id
    and s.content_type = 'ebook';

  return jsonb_build_object('ok', true, 'total', v_total, 'lidas', v_lidas);
end;
$$;

revoke all on function public.trail_ebook_marcar_lida(uuid) from public;
grant execute on function public.trail_ebook_marcar_lida(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Selo de trilha aberta: secoes de ebook nao contam como conteudo da
--    trilha (defensivo: ebook e material de revisao das trilhas certified).
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
  where s.trail_id = v_trail_id and s.content_type <> 'ebook';

  select count(distinct p.section_id) into v_feitas
  from public.trail_section_progress p
  join public.trail_sections s on s.id = p.section_id
  where p.profile_id = new.profile_id and s.trail_id = v_trail_id
    and s.content_type <> 'ebook';

  if v_total > 0 and v_feitas >= v_total then
    insert into public.profile_badges (profile_id, trail_id)
    values (new.profile_id, v_trail_id)
    on conflict (profile_id, trail_id) do nothing;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Iniciar/retomar a prova, agora com a regra do ebook:
--    - o gate "todas as secoes concluidas" NAO conta secoes de ebook (o
--      ebook e revisao, nao pre-requisito da primeira tentativa);
--    - depois de uma reprovacao: nova tentativa so com o cadeado vencido E
--      todas as secoes de ebook lidas; trilha sem ebook: so o cadeado.
-- ---------------------------------------------------------------------------
create or replace function public.trail_exam_iniciar(p_trail uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trail public.trails%rowtype;
  v_attempt public.exam_attempts%rowtype;
  v_total integer;
  v_feitas integer;
  v_lock timestamptz;
  v_ebook_total integer;
  v_ebook_lidas integer;
  v_n integer;
  v_banco integer;
  v_num integer;
  v_snapshot jsonb;
  v_mapa jsonb;
  v_attempt_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_autenticado');
  end if;

  select * into v_trail from public.trails where id = p_trail;
  if not found or v_trail.kind <> 'certified' or not private.trail_visivel(p_trail) then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  -- Prova em andamento: retoma o MESMO sorteio (snapshot imutavel).
  select * into v_attempt
  from public.exam_attempts
  where profile_id = v_uid and trail_id = p_trail and finished_at is null;
  if found then
    return jsonb_build_object('ok', true, 'retomada', true,
      'attempt_id', v_attempt.id, 'questoes', v_attempt.snapshot,
      'pass_score', v_trail.exam_pass_score);
  end if;

  -- So depois de TODAS as secoes de CONTEUDO concluidas (ebook nao conta).
  select count(*) into v_total from public.trail_sections
  where trail_id = p_trail and content_type <> 'ebook';
  select count(distinct pr.section_id) into v_feitas
  from public.trail_section_progress pr
  join public.trail_sections s on s.id = pr.section_id
  where pr.profile_id = v_uid and s.trail_id = p_trail
    and s.content_type <> 'ebook';
  if v_total = 0 or v_feitas < v_total then
    return jsonb_build_object('ok', false, 'erro', 'secoes_pendentes');
  end if;

  -- Cadeado de 7 dias da ultima reprovacao.
  select a.locked_until into v_lock
  from public.exam_attempts a
  where a.profile_id = v_uid and a.trail_id = p_trail and a.finished_at is not null
  order by a.attempt_number desc
  limit 1;
  if v_lock is not null and v_lock > now() then
    return jsonb_build_object('ok', false, 'erro', 'bloqueado', 'locked_until', v_lock);
  end if;

  -- Ebook de revisao: depois de reprovar, so refaz com o ebook lido ate o
  -- final. Trilha sem secoes de ebook: vale so o cadeado acima.
  if v_lock is not null then
    select count(*) into v_ebook_total
    from public.trail_sections
    where trail_id = p_trail and content_type = 'ebook';
    if v_ebook_total > 0 then
      select count(distinct p.section_id) into v_ebook_lidas
      from public.trail_ebook_progress p
      join public.trail_sections s on s.id = p.section_id
      where p.profile_id = v_uid and s.trail_id = p_trail
        and s.content_type = 'ebook';
      if v_ebook_lidas < v_ebook_total then
        return jsonb_build_object('ok', false, 'erro', 'ebook_pendente',
          'locked_until', v_lock,
          'ebook_total', v_ebook_total, 'ebook_lidas', v_ebook_lidas);
      end if;
    end if;
  end if;

  -- O banco precisa ter ao menos N questoes ativas.
  v_n := v_trail.exam_question_count;
  select count(*) into v_banco
  from public.trail_questions
  where trail_id = p_trail and ativo;
  if v_banco < v_n then
    return jsonb_build_object('ok', false, 'erro', 'banco_insuficiente');
  end if;

  -- Sorteio de N ativas; opcoes embaralhadas com UM mapa por questao (o
  -- mesmo mapa reordena as opcoes e depois corrige a resposta no envio).
  with sorteadas as (
    select q.id, q.enunciado, q.opcoes, s.titulo as topico
    from public.trail_questions q
    left join public.trail_sections s on s.id = q.section_id
    where q.trail_id = p_trail and q.ativo
    order by random()
    limit v_n
  ), com_mapa as (
    select sd.*,
      (select jsonb_agg(i order by random())
       from generate_series(0, jsonb_array_length(sd.opcoes) - 1) as i) as mapa
    from sorteadas sd
  )
  select
    jsonb_agg(jsonb_build_object(
      'q', cm.id,
      'enunciado', cm.enunciado,
      'topico', cm.topico,
      'opcoes', (
        select jsonb_agg(cm.opcoes ->> (e.value::int) order by e.ord)
        from jsonb_array_elements_text(cm.mapa) with ordinality as e(value, ord)
      ),
      'resposta', null)),
    jsonb_agg(cm.mapa)
  into v_snapshot, v_mapa
  from com_mapa cm;

  select coalesce(max(a.attempt_number), 0) + 1 into v_num
  from public.exam_attempts a
  where a.profile_id = v_uid and a.trail_id = p_trail;

  insert into public.exam_attempts (profile_id, trail_id, attempt_number, snapshot, mapa)
  values (v_uid, p_trail, v_num, v_snapshot, v_mapa)
  returning id into v_attempt_id;

  return jsonb_build_object('ok', true, 'retomada', false,
    'attempt_id', v_attempt_id, 'questoes', v_snapshot,
    'pass_score', v_trail.exam_pass_score);
end;
$$;

comment on table public.trail_ebook_progress is
  'Leitura do ebook de revisao por membro e secao. Leitura: dono e admin. Escrita: so via RPC trail_ebook_marcar_lida.';
