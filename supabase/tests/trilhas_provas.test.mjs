// Teste local (PGlite) da Etapa 3 das trilhas
// (migracao 20261108090000_trilhas_provas.sql).
//
// Contrato verificado (cadeia REAL de migracoes, roles anon/authenticated):
//   - prova so em trilha 'certified', so membro pagante (trail_visivel),
//     so com TODAS as secoes concluidas; banco precisa ter N questoes ativas;
//   - sorteio respeita N e so questoes ativas; dois sorteios diferem;
//     opcoes chegam embaralhadas e NENHUMA resposta entrega gabarito
//     (nem 'correta', nem o mapa de embaralhamento);
//   - prova em andamento e retomada com o MESMO sorteio;
//   - correcao no servidor: 7/10 (70%) aprova, 6/10 (60%) reprova;
//   - reprovado: locked_until = finished_at + 7 dias e novo inicio bloqueado
//     com a data; passado o prazo (simulado), libera e attempt_number sobe;
//   - segundo envio rejeitado; respostas fora do tamanho rejeitadas;
//   - RLS: membro nao le banco de questoes; membro le so as proprias
//     tentativas; admin le tudo; ninguem escreve tentativa direto; anon
//     nao executa as RPCs nem le as tabelas;
//   - isolamento: conta free fica fora; trilha is_test so aceita prova de
//     perfil is_test; perfil comum nao inicia prova de trilha de teste.
//
// Como rodar:  npm run test:trilhas-provas
//
// Nao toca em producao; tudo acontece em memoria no processo do teste.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const dirMigrations = path.join(raiz, '..', 'migrations');

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, nome) => {
  if (cond) { pass++; console.log(`ok   ${nome}`); }
  else { fail++; console.log(`FALHOU ${nome}`); }
};

// ---------- shims (mesmos de trilhas.test.mjs) ----------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text,
    owner uuid
  );
  alter table storage.objects enable row level security;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  grant usage on schema storage to authenticated;
  grant select on storage.buckets to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
`);

const aplicar = async (sql) => {
  const limpo = sql.replace(/create extension if not exists pgcrypto;/i, '');
  await db.exec(limpo);
};

const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(arquivos.some((f) => f.includes('trilhas_provas')),
  `cadeia real aplicada (${arquivos.length} migracoes, inclui provas)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ids = {};
ids.admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
ids.prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Pagante' });
ids.prof2 = await criarUsuario('prof2@teste.local', { role: 'professional', display_name: 'Prof Dois' });
ids.free = await criarUsuario('free@teste.local', { role: 'professional', display_name: 'Prof Free' });
ids.profTeste = await criarUsuario('profteste@teste.local', { role: 'professional', display_name: 'Prof de Teste' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.profTeste]);
const pagar = async (uid, plano) => db.query(
  `update public.subscriptions
   set plan = $2, status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`,
  [uid, plano]);
await pagar(ids.prof, 'pro_professional');
await pagar(ids.prof2, 'pro_professional');
await pagar(ids.profTeste, 'pro_professional');

const comoUsuario = async (uid, sql, params = [], commit = false) => {
  await db.query('begin');
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  let r, erro = null;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    erro = e;
  }
  await db.query(commit && !erro ? 'commit' : 'rollback');
  return { rows: r?.rows ?? [], erro };
};
const comoAnon = async (sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role anon`);
  let r, erro = null;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    erro = e;
  }
  await db.query('rollback');
  return { rows: r?.rows ?? [], erro };
};

// ---------- trilha certificada de trabalho ----------
const criarTrilha = (titulo, kind, published, isTest = false) =>
  comoUsuario(ids.admin,
    `insert into public.trails (titulo, descricao, audience, kind, published, is_test, ordem)
     values ($1, 'desc', 'professional', $2, $3, $4, 0) returning id`,
    [titulo, kind, published, isTest], true);

let r = await criarTrilha('NR Básico', 'certified', true);
const idCert = r.rows[0].id;
r = await criarTrilha('Trilha Aberta', 'open', true);
const idAberta = r.rows[0].id;
r = await criarTrilha('NR de Teste', 'certified', true, true);
const idCertTeste = r.rows[0].id;

const criarSecao = (trailId, ordem, titulo) =>
  comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, $2, $3, 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') returning id`,
    [trailId, ordem, titulo], true);

const sec = {};
for (const [trail, prefixo] of [[idCert, 'C'], [idCertTeste, 'T']]) {
  for (const i of [1, 2]) {
    const rs = await criarSecao(trail, i, `${prefixo}${i}`);
    sec[`${prefixo}${i}`] = rs.rows[0].id;
  }
}
{
  const rs = await criarSecao(idAberta, 1, 'A1');
  sec.A1 = rs.rows[0].id;
}
ok(Object.keys(sec).length === 5, 'secoes criadas (2+2+1)');

// Banco: 12 questoes ativas na trilha certificada (prova sorteia 10),
// alternando a secao de referencia; 1 inativa que nunca pode cair.
const criarQuestao = (trailId, i, secao, ativa = true) =>
  comoUsuario(ids.admin,
    `insert into public.trail_questions (trail_id, section_id, enunciado, opcoes, correta, ativo)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [trailId, secao, `Questão ${i}`,
     JSON.stringify([`q${i}a`, `q${i}b`, `q${i}c`, `q${i}d`]), i % 4, ativa], true);

const questoesCert = [];
for (let i = 0; i < 12; i++) {
  const rs = await criarQuestao(idCert, i, i % 2 === 0 ? sec.C1 : sec.C2);
  questoesCert.push(rs.rows[0].id);
}
await criarQuestao(idCert, 99, sec.C1, false); // inativa
for (let i = 0; i < 10; i++) await criarQuestao(idCertTeste, i, sec.T1);
ok(questoesCert.length === 12, 'banco com 12 questoes ativas (+1 inativa)');

const concluirTodas = async (uid, trailId) => {
  const secs = trailId === idCert ? [sec.C1, sec.C2] : [sec.T1, sec.T2];
  for (const s of secs) {
    await comoUsuario(uid,
      `insert into public.trail_section_progress (profile_id, section_id) values ($1, $2)`,
      [uid, s], true);
  }
};

const iniciar = (uid, trailId) =>
  comoUsuario(uid, `select public.trail_exam_iniciar($1) as r`, [trailId], true)
    .then((x) => ({ ...x, json: x.rows[0]?.r }));
const enviar = (uid, attemptId, respostas) =>
  comoUsuario(uid, `select public.trail_exam_enviar($1, $2::jsonb) as r`,
    [attemptId, JSON.stringify(respostas)], true)
    .then((x) => ({ ...x, json: x.rows[0]?.r }));

// ---------- gates de entrada ----------
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === false && r.json.erro === 'secoes_pendentes',
  'sem todas as secoes concluidas: prova bloqueada');
r = await iniciar(ids.free, idCert);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'conta free nao inicia prova (trilha invisivel)');
r = await iniciar(ids.prof, idAberta);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'trilha open nao tem prova');
r = await iniciar(ids.prof, idCertTeste);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'perfil comum nao inicia prova de trilha is_test');
r = await comoAnon(`select public.trail_exam_iniciar($1)`, [idCert]);
ok(!!r.erro, 'anon nao executa trail_exam_iniciar (grant revogado)');

// Banco insuficiente: trilha de teste tem 10 ativas; baixa o corte para 11
await comoUsuario(ids.admin,
  `update public.trails set exam_question_count = 11 where id = $1`, [idCertTeste], true);
await concluirTodas(ids.profTeste, idCertTeste);
r = await iniciar(ids.profTeste, idCertTeste);
ok(r.json?.ok === false && r.json.erro === 'banco_insuficiente',
  'banco com menos questoes ativas que N bloqueia');
await criarQuestao(idCertTeste, 10, sec.T1);
r = await iniciar(ids.profTeste, idCertTeste);
ok(r.json?.ok === true, 'perfil is_test inicia prova de trilha is_test');
const tentTeste = r.json;

// ---------- sorteio ----------
await concluirTodas(ids.prof, idCert);
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === true && !r.json.retomada, 'inicio ok apos concluir secoes');
const tent1 = r.json;
ok(tent1.questoes.length === 10, 'sorteio respeita N (10 questoes)');
ok(tent1.questoes.every((q) => !('correta' in q) && !('mapa' in q)),
  'nenhuma questao entregue traz gabarito ou mapa');
ok(!JSON.stringify(tent1).includes('mapa') && tent1.mapa === undefined,
  'resposta do inicio nao traz o mapa de embaralhamento');
{
  const inativas = tent1.questoes.filter((q) => q.enunciado === 'Questão 99');
  ok(inativas.length === 0, 'questao inativa nunca e sorteada');
}
{
  // duas contas, mesmo banco: sorteios (conjunto OU ordem) diferem
  await concluirTodas(ids.prof2, idCert);
  const r2 = await iniciar(ids.prof2, idCert);
  const tent2 = r2.json;
  ok(JSON.stringify(tent1.questoes.map((q) => q.q)) !== JSON.stringify(tent2.questoes.map((q) => q.q)),
    'dois sorteios independem (ordem/conjunto diferem)');
}

// retomada: mesmo sorteio, mesmo attempt
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === true && r.json.retomada === true && r.json.attempt_id === tent1.attempt_id
   && JSON.stringify(r.json.questoes) === JSON.stringify(tent1.questoes),
  'retomada devolve o mesmo sorteio (snapshot imutavel)');

// ---------- correcao no servidor ----------
// Descobre as respostas certas do sorteio do prof via banco (como o testador;
// o membro nao tem como: nao le trail_questions nem recebe mapa).
const { rows: gabarito } = await db.query(
  `select (elem.value ->> 'q')::uuid as qid, (elem.ord - 1)::int as pos,
          q.correta, (a.mapa -> (elem.ord - 1)::int) as mapa_q
   from public.exam_attempts a,
        jsonb_array_elements(a.snapshot) with ordinality as elem(value, ord)
   join public.trail_questions q on q.id = (elem.value ->> 'q')::uuid
   where a.id = $1`, [tent1.attempt_id]);
const indiceCerto = new Map();
for (const g of gabarito) {
  // posicao embaralhada cuja origem e o indice correto
  const mapa = g.mapa_q;
  indiceCerto.set(g.pos, mapa.findIndex((orig) => orig === g.correta));
}

// prof acerta tudo? Nao: 7 certas -> 70 -> aprovado no corte
const resp70 = gabarito.map((g) => 0);
for (const g of gabarito) resp70[g.pos] = 99; // tudo errado
for (let k = 0; k < 7; k++) resp70[gabarito[k].pos] = indiceCerto.get(gabarito[k].pos);
r = await enviar(ids.prof, tent1.attempt_id, resp70);
ok(r.json?.ok === true && r.json.passed === true && r.json.score === 70,
  '7 de 10 (70%) aprova no corte padrao');
ok(!('topicos' in r.json) && !('locked_until' in r.json),
  'aprovacao nao devolve topicos de revisao nem cadeado');

// prof2 acerta 6 de 10 -> 60 -> reprovado com cadeado e topicos
const r2 = await iniciar(ids.prof2, idCert); // retomada da prova ja aberta
const tent2 = r2.json;
const { rows: gab2 } = await db.query(
  `select (elem.ord - 1)::int as pos, q.correta, (a.mapa -> (elem.ord - 1)::int) as mapa_q,
          elem.value ->> 'topico' as topico
   from public.exam_attempts a,
        jsonb_array_elements(a.snapshot) with ordinality as elem(value, ord)
   join public.trail_questions q on q.id = (elem.value ->> 'q')::uuid
   where a.id = $1`, [tent2.attempt_id]);
const resp60 = gab2.map((g) => 0);
for (const g of gab2) resp60[g.pos] = 99;
for (let k = 0; k < 6; k++) {
  const g = gab2[k];
  resp60[g.pos] = g.mapa_q.findIndex((orig) => orig === g.correta);
}
r = await enviar(ids.prof2, tent2.attempt_id, resp60);
ok(r.json?.ok === true && r.json.passed === false && r.json.score === 60,
  '6 de 10 (60%) reprova');
ok(Array.isArray(r.json.topicos) && r.json.topicos.length > 0
   && r.json.topicos.every((t) => typeof t === 'string'),
  'reprovacao devolve topicos (titulos de secao) das questoes erradas');
ok(!!r.json.locked_until, 'reprovacao devolve a data de liberacao');
{
  const { rows } = await db.query(
    `select locked_until - finished_at as delta from public.exam_attempts where id = $1`,
    [tent2.attempt_id]);
  ok(String(rows[0].delta).startsWith('7 days'),
    'cadeado e exatamente finished_at + 7 dias');
}
ok(!JSON.stringify(r.json).includes('"correta"'),
  'resultado da correcao nao revela a alternativa certa');

// bloqueio enquanto o cadeado vale
r = await iniciar(ids.prof2, idCert);
ok(r.json?.ok === false && r.json.erro === 'bloqueado' && !!r.json.locked_until,
  'nova tentativa bloqueada com a data de liberacao');

// depois do prazo (simulado): libera e attempt_number sobe
await db.query(
  `update public.exam_attempts set locked_until = now() - interval '1 hour' where id = $1`,
  [tent2.attempt_id]);
r = await iniciar(ids.prof2, idCert);
ok(r.json?.ok === true && !r.json.retomada, 'cadeado vencido libera nova tentativa');
{
  const { rows } = await db.query(
    `select attempt_number from public.exam_attempts where id = $1`, [r.json.attempt_id]);
  ok(rows[0].attempt_number === 2, 'segunda tentativa tem attempt_number 2');
}

// ---------- integridade do envio ----------
const tent2b = r.json.attempt_id;
r = await enviar(ids.prof2, tent2b, [0, 1]);
ok(r.json?.ok === false && r.json.erro === 'respostas_invalidas',
  'envio com numero errado de respostas e rejeitado');
r = await enviar(ids.prof2, tent2b, Array(10).fill(null));
ok(r.json?.ok === true && r.json.score === 0 && r.json.passed === false,
  'prova em branco vale 0 e reprova');
r = await enviar(ids.prof2, tent2b, Array(10).fill(0));
ok(r.json?.ok === false && r.json.erro === 'ja_finalizada',
  'segundo envio e rejeitado (snapshot nao muda depois de finalizada)');
r = await enviar(ids.prof, tent2b, Array(10).fill(0));
ok(r.json?.ok === false && r.json.erro === 'nao_encontrada',
  'ninguem envia prova de outra conta');

// ---------- RLS ----------
r = await comoUsuario(ids.prof, `select count(*) as n from public.trail_questions`);
ok(r.rows[0].n === 0, 'membro nao le o banco de questoes');
r = await comoUsuario(ids.prof,
  `insert into public.trail_questions (trail_id, enunciado, opcoes, correta)
   values ($1, 'x', '["a","b"]', 0)`, [idCert]);
ok(!!r.erro, 'membro nao insere questao');
r = await comoUsuario(ids.prof,
  `insert into public.exam_attempts (profile_id, trail_id, attempt_number, snapshot, mapa)
   values ($1, $2, 9, '[]', '[]')`, [ids.prof, idCert]);
ok(!!r.erro, 'membro nao insere tentativa direto');
r = await comoUsuario(ids.prof,
  `update public.exam_attempts set score = 100, passed = true where profile_id = $1`, [ids.prof]);
ok(!!r.erro, 'membro nao atualiza a propria tentativa (sem policy de escrita)');
r = await comoUsuario(ids.prof2,
  `select count(*) as n from public.exam_attempts where profile_id <> $1`, [ids.prof2]);
ok(r.rows[0].n === 0, 'membro le so as proprias tentativas');
r = await comoUsuario(ids.admin, `select count(*) as n from public.exam_attempts`);
ok(Number(r.rows[0].n) >= 4, 'admin le todas as tentativas (log por conta)');
r = await comoUsuario(ids.admin, `select count(*) as n from public.trail_questions`);
ok(Number(r.rows[0].n) >= 22, 'admin le o banco de questoes');
r = await comoAnon(`select count(*) as n from public.exam_attempts`);
ok(!!r.erro, 'anon nao le tentativas');

// ---------- snapshot guarda as respostas dadas ----------
{
  const { rows } = await db.query(
    `select snapshot from public.exam_attempts where id = $1`, [tent1.attempt_id]);
  const snap = rows[0].snapshot;
  ok(snap.every((q, i) => q.resposta === resp70[i]),
    'snapshot final registra as respostas dadas, na ordem entregue');
  ok(snap.every((q) => !('correta' in q)), 'snapshot final continua sem gabarito');
}

// ---------- cascata ----------
await db.query(`delete from public.trails where id = $1`, [idCert]);
{
  const { rows } = await db.query(
    `select count(*) as n from public.exam_attempts where trail_id = $1`, [idCert]);
  ok(rows[0].n === 0, 'apagar a trilha remove as tentativas (cascade)');
  const { rows: rq } = await db.query(
    `select count(*) as n from public.trail_questions where trail_id = $1`, [idCert]);
  ok(rq[0].n === 0, 'apagar a trilha remove as questoes (cascade)');
}

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
