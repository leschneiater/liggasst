-- Etapa 3 das trilhas (pedido dela 04/11/2026): avaliacao das trilhas
-- 'certified' (prova de NR). Regras aprovadas: nota minima 70%, uma tentativa
-- por vez, reprovacao trava por 7 dias, banco de questoes com sorteio, prova
-- so depois de TODAS as secoes concluidas, registro de tentativa por conta.
--
-- Uma so fonte de verdade, no servidor (estas RPCs + RLS):
-- - prova so em trilha 'certified' visivel ao membro pagante
--   (private.trail_visivel, que ja cobre cortesia via private.plano_da_conta);
-- - sorteio de N questoes ativas com opcoes embaralhadas; o snapshot entregue
--   NUNCA contem o indice correto (gabarito nao sai do banco); a correcao e
--   feita aqui, no envio, via o mapa de embaralhamento guardado na tentativa;
-- - reprovado: locked_until = finished_at + 7 dias; nova tentativa so depois
--   (liberacao automatica; o e-book da etapa 4 nao entra aqui);
-- - aprovado: passed = true; a emissao do certificado e a etapa 5 (retroativo
--   para aprovados anteriores).

-- ---------------------------------------------------------------------------
-- 1) Configuracao da prova na trilha
-- ---------------------------------------------------------------------------
alter table public.trails
  add column exam_question_count integer not null default 10
    check (exam_question_count between 1 and 50),
  add column exam_pass_score integer not null default 70
    check (exam_pass_score between 0 and 100);

-- ---------------------------------------------------------------------------
-- 2) Banco de questoes (so admin le e escreve; maior que a prova)
-- ---------------------------------------------------------------------------
create table public.trail_questions (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails(id) on delete cascade,
  -- Secao de referencia: vira o "topico" exibido na revisao do membro que
  -- errar a questao (sem revelar a alternativa certa).
  section_id uuid references public.trail_sections(id) on delete set null,
  enunciado text not null,
  opcoes jsonb not null,
  correta integer not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(opcoes) = 'array'
         and jsonb_array_length(opcoes) between 2 and 6),
  check (correta >= 0 and correta < jsonb_array_length(opcoes))
);

create index trail_questions_trail_idx on public.trail_questions (trail_id) where ativo;

create trigger trail_questions_set_updated_at before update on public.trail_questions
  for each row execute function private.set_updated_at();

revoke all on public.trail_questions from public, anon, authenticated;
grant select, insert, update, delete on public.trail_questions to authenticated;

alter table public.trail_questions enable row level security;

-- So admin: o membro NUNCA le o banco de questoes (e o gabarito).
create policy trail_questions_admin_all on public.trail_questions
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- 3) Tentativas (log por conta; escrita so via RPC)
-- ---------------------------------------------------------------------------
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trail_id uuid not null references public.trails(id) on delete cascade,
  attempt_number integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer check (score between 0 and 100),
  passed boolean,
  -- Snapshot do sorteio: questoes com ordem, opcoes embaralhadas e, no
  -- envio, as respostas dadas. SEM gabarito: o membro le as proprias
  -- tentativas pela RLS e nada aqui revela a alternativa certa.
  snapshot jsonb not null,
  -- Mapa do embaralhamento (posicao entregue -> indice original). Sozinho
  -- nao revela nada: sem ler trail_questions.correta (so admin), nao diz
  -- qual alternativa e a certa.
  mapa jsonb not null,
  locked_until timestamptz,
  unique (profile_id, trail_id, attempt_number)
);

create index exam_attempts_profile_idx on public.exam_attempts (profile_id, trail_id);

revoke all on public.exam_attempts from public, anon, authenticated;
grant select on public.exam_attempts to authenticated;

alter table public.exam_attempts enable row level security;

create policy exam_attempts_select_own on public.exam_attempts
  for select to authenticated
  using (profile_id = auth.uid());

create policy exam_attempts_select_admin on public.exam_attempts
  for select to authenticated
  using ((select private.is_admin()));

-- Sem policies de insert/update/delete: so as RPCs (security definer) escrevem.

-- ---------------------------------------------------------------------------
-- 4) Iniciar/retomar a prova
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

  -- So depois de TODAS as secoes concluidas.
  select count(*) into v_total from public.trail_sections where trail_id = p_trail;
  select count(distinct pr.section_id) into v_feitas
  from public.trail_section_progress pr
  join public.trail_sections s on s.id = pr.section_id
  where pr.profile_id = v_uid and s.trail_id = p_trail;
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

revoke all on function public.trail_exam_iniciar(uuid) from public;
grant execute on function public.trail_exam_iniciar(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Enviar a prova (correcao no servidor; gabarito nunca e devolvido)
-- ---------------------------------------------------------------------------
create or replace function public.trail_exam_enviar(p_attempt uuid, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_attempt public.exam_attempts%rowtype;
  v_trail public.trails%rowtype;
  v_total integer;
  v_acertos integer;
  v_topicos text[];
  v_score integer;
  v_passed boolean;
  v_snapshot jsonb;
  v_lock timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_autenticado');
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt and profile_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrada');
  end if;
  if v_attempt.finished_at is not null then
    return jsonb_build_object('ok', false, 'erro', 'ja_finalizada');
  end if;

  v_total := jsonb_array_length(v_attempt.snapshot);
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'array'
     or jsonb_array_length(p_respostas) <> v_total then
    return jsonb_build_object('ok', false, 'erro', 'respostas_invalidas');
  end if;

  select * into v_trail from public.trails where id = v_attempt.trail_id;

  -- Correcao: resposta na posicao embaralhada -> indice original via mapa ->
  -- compara com trail_questions.correta (que o membro nao pode ler).
  with elem as (
    select
      (e.ord - 1) as i,
      (e.value ->> 'q')::uuid as qid,
      e.value ->> 'topico' as topico,
      (v_attempt.mapa -> (e.ord - 1)::int) as mapa_q,
      ((p_respostas ->> (e.ord - 1)::int))::int as resp
    from jsonb_array_elements(v_attempt.snapshot) with ordinality as e(value, ord)
  ), gabarito as (
    select el.topico,
           coalesce((el.resp is not null
            and q.correta is not null
            and (el.mapa_q ->> el.resp)::int = q.correta), false) as acertou
    from elem el
    left join public.trail_questions q on q.id = el.qid
  )
  select count(*) filter (where acertou),
         coalesce(array_agg(distinct coalesce(topico, 'Conteúdo geral da trilha'))
                    filter (where not acertou), '{}')
  into v_acertos, v_topicos
  from gabarito;

  v_score := round(100.0 * v_acertos / v_total)::int;
  v_passed := v_score >= v_trail.exam_pass_score;
  if not v_passed then
    v_lock := now() + interval '7 days';
  end if;

  -- Respostas entram no snapshot (registro da tentativa); o snapshot do
  -- sorteio em si nao muda e um segundo envio e rejeitado acima.
  select jsonb_agg(e.value || jsonb_build_object('resposta', p_respostas -> (e.ord - 1)::int)
                   order by e.ord)
  into v_snapshot
  from jsonb_array_elements(v_attempt.snapshot) with ordinality as e(value, ord);

  update public.exam_attempts
  set finished_at = now(),
      score = v_score,
      passed = v_passed,
      snapshot = v_snapshot,
      locked_until = v_lock
  where id = p_attempt;

  if v_passed then
    return jsonb_build_object('ok', true, 'passed', true, 'score', v_score,
      'pass_score', v_trail.exam_pass_score);
  end if;
  return jsonb_build_object('ok', true, 'passed', false, 'score', v_score,
    'pass_score', v_trail.exam_pass_score,
    'locked_until', v_lock, 'topicos', v_topicos);
end;
$$;

revoke all on function public.trail_exam_enviar(uuid, jsonb) from public;
grant execute on function public.trail_exam_enviar(uuid, jsonb) to authenticated;

comment on table public.trail_questions is
  'Banco de questoes das trilhas com certificado. Leitura e escrita so do admin; o gabarito nunca sai do banco.';
comment on table public.exam_attempts is
  'Tentativas de prova por conta. Leitura: dono e admin. Escrita: so via RPC trail_exam_iniciar/trail_exam_enviar.';
