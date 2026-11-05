// Teste local (PGlite) da Etapa 4 das trilhas
// (migracao 20261108100000_trilhas_ebook.sql).
//
// Contrato verificado (cadeia REAL de migracoes, roles anon/authenticated):
//   - secao de ebook guarda TEXTO (constraint nova); demais tipos inalterados;
//   - o gate "todas as secoes" da prova NAO conta secoes de ebook;
//   - marcar leitura: so secao de ebook de trilha visivel (gate pago +
//     isolamento is_test); idempotente; RLS: membro le so o proprio
//     progresso, admin le tudo; anon fora;
//   - desbloqueio da nova tentativa: cadeado de 7 dias E ebook lido ate o
//     final; antes do prazo bloqueia mesmo com ebook lido; depois do prazo
//     sem ebook completo bloqueia com 'ebook_pendente' (total/lidas);
//   - trilha sem secoes de ebook: vale so o cadeado;
//   - selo de trilha aberta ignora secoes de ebook na contagem.
//
// Como rodar:  npm run test:trilhas-ebook
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

// ---------- shims (mesmos de trilhas_provas.test.mjs) ----------
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
ok(arquivos.some((f) => f.includes('trilhas_ebook')),
  `cadeia real aplicada (${arquivos.length} migracoes, inclui ebook)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ids = {};
ids.admin = await criarUsuario('admin@ebook.local', { role: 'admin', display_name: 'Admin' });
ids.prof = await criarUsuario('prof@ebook.local', { role: 'professional', display_name: 'Prof' });
ids.prof2 = await criarUsuario('prof2@ebook.local', { role: 'professional', display_name: 'Prof Dois' });
ids.free = await criarUsuario('free@ebook.local', { role: 'professional', display_name: 'Free' });
ids.profTeste = await criarUsuario('teste@ebook.local', { role: 'professional', display_name: 'De Teste' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.profTeste]);
const pagar = async (uid) => db.query(
  `update public.subscriptions
   set plan = 'pro_professional', status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`, [uid]);
await pagar(ids.prof); await pagar(ids.prof2); await pagar(ids.profTeste);

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

const criarTrilha = (titulo, kind, published, isTest = false) =>
  comoUsuario(ids.admin,
    `insert into public.trails (titulo, descricao, audience, kind, published, is_test, ordem)
     values ($1, 'desc', 'professional', $2, $3, $4, 0) returning id`,
    [titulo, kind, published, isTest], true);
const criarSecaoConteudo = (trailId, ordem, titulo) =>
  comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, $2, $3, 'link', 'https://exemplo.com/material') returning id`,
    [trailId, ordem, titulo], true);
const criarSecaoEbook = (trailId, ordem, titulo, texto = 'Texto de revisao da norma.') =>
  comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, $2, $3, 'ebook', $4) returning id`,
    [trailId, ordem, titulo, texto], true);
const criarQuestoes = async (trailId, n, secao) => {
  for (let i = 0; i < n; i++) {
    await comoUsuario(ids.admin,
      `insert into public.trail_questions (trail_id, section_id, enunciado, opcoes, correta, ativo)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [trailId, secao, `Questão ${i}`,
       JSON.stringify([`q${i}a`, `q${i}b`, `q${i}c`, `q${i}d`]), i % 4, true], true);
  }
};

let r = await criarTrilha('NR com Ebook', 'certified', true);
const idCert = r.rows[0].id;
r = await criarTrilha('NR sem Ebook', 'certified', true);
const idSem = r.rows[0].id;
r = await criarTrilha('NR de Teste', 'certified', true, true);
const idTest = r.rows[0].id;
r = await criarTrilha('Aberta com Ebook', 'open', true);
const idAberta = r.rows[0].id;

const sec = {};
for (const [t, p] of [[idCert, 'C'], [idTest, 'T'], [idAberta, 'A']]) {
  const rs = await criarSecaoConteudo(t, 1, `${p}-conteudo`);
  sec[`${p}1`] = rs.rows[0].id;
}
{
  const rs = await criarSecaoConteudo(idCert, 2, 'C2-conteudo');
  sec.C2 = rs.rows[0].id;
}
{
  const rs = await criarSecaoConteudo(idSem, 1, 'S-conteudo');
  sec.S1 = rs.rows[0].id;
}
// ebook: 2 partes na trilha principal, 1 na de teste, 1 na aberta
r = await criarSecaoEbook(idCert, 8, 'Ebook parte 1'); sec.E1 = r.rows[0].id;
r = await criarSecaoEbook(idCert, 9, 'Ebook parte 2'); sec.E2 = r.rows[0].id;
r = await criarSecaoEbook(idTest, 8, 'Ebook teste'); sec.ET = r.rows[0].id;
r = await criarSecaoEbook(idAberta, 8, 'Ebook da aberta'); sec.EA = r.rows[0].id;
ok(Object.keys(sec).length === 9, 'secoes criadas (conteudo + ebook)');

await criarQuestoes(idCert, 12, sec.C1);
await criarQuestoes(idSem, 10, sec.S1);
await criarQuestoes(idTest, 10, sec.T1);

// ---------- constraint: ebook guarda texto ----------
{
  const x = await comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, 20, 'Ebook URL', 'ebook', 'https://exemplo.com/ebook') returning id`, [idCert], true);
  ok(!x.erro && x.rows[0]?.id, 'secao ebook aceita texto livre (constraint nova)');
  const y = await comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, 21, 'Ebook vazio', 'ebook', 'ab')`, [idCert]);
  ok(!!y.erro, 'secao ebook exige texto com 3+ caracteres');
  const z = await comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, 22, 'Link texto', 'link', 'texto puro')`, [idCert]);
  ok(!!z.erro, 'secao link continua exigindo http(s)');
  const w = await comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, 23, 'PDF errado', 'pdf', 'https://exemplo.com/x.pdf')`, [idCert]);
  ok(!!w.erro, 'secao pdf continua exigindo path <uuid>.pdf');
}
// limpa a secao extra aceita acima para nao interferir nas contagens
await db.query(`delete from public.trail_sections where trail_id = $1 and ordem = 20`, [idCert]);

const concluirConteudo = async (uid, secoes) => {
  for (const s of secoes) {
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
const marcarLida = (uid, sectionId) =>
  comoUsuario(uid, `select public.trail_ebook_marcar_lida($1) as r`, [sectionId], true)
    .then((x) => ({ ...x, json: x.rows[0]?.r }));

// Respostas todas ERRADAS do sorteio (gabarito lido como testador, via banco).
const reprovar = async (uid, trailId) => {
  const ini = await iniciar(uid, trailId);
  if (!ini.json?.ok) return { ini };
  const tent = ini.json;
  const { rows: gab } = await db.query(
    `select (elem.ord - 1)::int as pos, q.correta, (a.mapa -> (elem.ord - 1)::int) as mapa_q
     from public.exam_attempts a,
          jsonb_array_elements(a.snapshot) with ordinality as elem(value, ord)
     join public.trail_questions q on q.id = (elem.value ->> 'q')::uuid
     where a.id = $1`, [tent.attempt_id]);
  const resp = gab.map((g) => g.mapa_q.findIndex((orig) => orig !== g.correta));
  const fim = await enviar(uid, tent.attempt_id, resp);
  return { ini, tent, fim };
};

// ---------- gate de secoes ignora o ebook ----------
await concluirConteudo(ids.prof, [sec.C1]);
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === false && r.json.erro === 'secoes_pendentes',
  'faltando secao de conteudo: bloqueia mesmo sem exigir ebook');
await concluirConteudo(ids.prof, [sec.C2]);
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === true, 'primeira tentativa NAO exige leitura do ebook');
await enviar(ids.prof, r.json.attempt_id, []); // descarta: tamanho errado rejeitado, prova segue aberta
{
  // fecha a prova aberta sem score para reabrir limpo: simula abandono
  await db.query(`delete from public.exam_attempts where profile_id = $1 and finished_at is null`, [ids.prof]);
}

// ---------- marcar leitura: gates ----------
r = await marcarLida(ids.free, sec.E1);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'conta free nao marca leitura (trilha invisivel)');
r = await marcarLida(ids.prof, sec.C1);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'secao de conteudo nao e marcavel como ebook');
r = await marcarLida(ids.prof, sec.ET);
ok(r.json?.ok === false && r.json.erro === 'indisponivel',
  'perfil comum nao le ebook de trilha is_test');
r = await marcarLida(ids.profTeste, sec.ET);
ok(r.json?.ok === true && r.json.total === 1 && r.json.lidas === 1,
  'perfil is_test le ebook de trilha is_test');
r = await comoAnon(`select public.trail_ebook_marcar_lida($1)`, [sec.E1]);
ok(!!r.erro, 'anon nao executa trail_ebook_marcar_lida (grant revogado)');

// progresso persiste e e idempotente
r = await marcarLida(ids.prof, sec.E1);
ok(r.json?.ok === true && r.json.total === 2 && r.json.lidas === 1, 'leitura 1 de 2 registrada');
r = await marcarLida(ids.prof, sec.E1);
ok(r.json?.ok === true && r.json.lidas === 1, 'marcar de novo e idempotente');

// RLS do progresso
{
  const x = await comoUsuario(ids.prof2,
    `select count(*)::int as n from public.trail_ebook_progress where profile_id = $1`, [ids.prof]);
  ok(x.rows[0].n === 0, 'membro nao le progresso de ebook de outro');
  const y = await comoUsuario(ids.admin,
    `select count(*)::int as n from public.trail_ebook_progress`, []);
  ok(y.rows[0].n >= 2, 'admin le todo o progresso de ebook');
}

// ---------- desbloqueio: cadeado + ebook ----------
// prof reprova na trilha com ebook
const rep1 = await reprovar(ids.prof, idCert);
ok(rep1.fim?.json?.passed === false && !!rep1.fim.json.locked_until,
  'prof reprova (0%) e recebe cadeado');

// durante o cadeado, mesmo lendo tudo, segue bloqueado
await marcarLida(ids.prof, sec.E2);
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === false && r.json.erro === 'bloqueado',
  'dentro dos 7 dias bloqueia MESMO com o ebook lido');

// cadeado vencido + ebook completo -> libera
await db.query(
  `update public.exam_attempts set locked_until = now() - interval '1 hour'
   where profile_id = $1 and trail_id = $2 and finished_at is not null`,
  [ids.prof, idCert]);
r = await iniciar(ids.prof, idCert);
ok(r.json?.ok === true && !r.json.retomada, 'cadeado vencido + ebook lido: nova tentativa libera');
await db.query(`delete from public.exam_attempts where profile_id = $1 and finished_at is null`, [ids.prof]);

// prof2 reprova, cadeado vence, mas NAO leu o ebook
await concluirConteudo(ids.prof2, [sec.C1, sec.C2]);
const rep2 = await reprovar(ids.prof2, idCert);
ok(rep2.fim?.json?.passed === false, 'prof2 reprova');
await db.query(
  `update public.exam_attempts set locked_until = now() - interval '1 hour'
   where profile_id = $1 and trail_id = $2 and finished_at is not null`,
  [ids.prof2, idCert]);
r = await iniciar(ids.prof2, idCert);
ok(r.json?.ok === false && r.json.erro === 'ebook_pendente'
   && r.json.ebook_total === 2 && r.json.ebook_lidas === 0,
  'cadeado vencido SEM ebook: bloqueia com ebook_pendente (0 de 2)');
await marcarLida(ids.prof2, sec.E1);
r = await iniciar(ids.prof2, idCert);
ok(r.json?.ok === false && r.json.erro === 'ebook_pendente' && r.json.ebook_lidas === 1,
  'ebook pela metade: segue bloqueado (1 de 2)');
await marcarLida(ids.prof2, sec.E2);
r = await iniciar(ids.prof2, idCert);
ok(r.json?.ok === true, 'ebook completo + cadeado vencido: libera');
await db.query(`delete from public.exam_attempts where profile_id = $1 and finished_at is null`, [ids.prof2]);

// ---------- trilha sem ebook: so o cadeado ----------
await concluirConteudo(ids.prof, [sec.S1]);
const rep3 = await reprovar(ids.prof, idSem);
ok(rep3.fim?.json?.passed === false, 'prof reprova na trilha sem ebook');
await db.query(
  `update public.exam_attempts set locked_until = now() - interval '1 hour'
   where profile_id = $1 and trail_id = $2 and finished_at is not null`,
  [ids.prof, idSem]);
r = await iniciar(ids.prof, idSem);
ok(r.json?.ok === true, 'trilha sem ebook: cadeado vencido basta');
await db.query(`delete from public.exam_attempts where profile_id = $1 and finished_at is null`, [ids.prof]);

// ---------- selo ignora secoes de ebook ----------
await concluirConteudo(ids.prof, [sec.A1]);
{
  const { rows } = await db.query(
    `select count(*)::int as n from public.profile_badges where profile_id = $1 and trail_id = $2`,
    [ids.prof, idAberta]);
  ok(rows[0].n === 1, 'selo de trilha aberta sai sem exigir leitura do ebook');
}

// ---------- resumo ----------
console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
