// Teste local (PGlite) da Etapa 1 das trilhas com certificado
// (migracao 20261108070000_trilhas_certificados.sql).
//
// Contrato verificado (cadeia REAL de migracoes, roles anon/authenticated):
//   - visitante (anon) nao le nada (sem grant);
//   - membro aprovado FREE nao ve trilha publicada; pendente tambem nao;
//   - pagante ve so trilha publicada do proprio publico;
//   - trilha is_test so aparece para perfil is_test (pagante) e admin;
//   - secoes seguem a visibilidade da trilha;
//   - curador aparece quando cura trilha visivel; curador so de rascunho
//     nao aparece para membro; admin ve e gerencia tudo;
//   - checks de conteudo da secao (pdf = path, demais = URL http/s);
//   - junction: duplicata rejeitada; delete da trilha cascateia;
//   - seed do Fabio presente, com registro pendente (null).
//
// Como rodar:  npm run test:trilhas
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

// ---------- shims (mesmos de trainings.test.mjs) ----------
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

// ---------- cadeia real de migracoes ----------
const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(true, `cadeia real aplicada (${arquivos.length} migracoes, inclui trilhas)`);

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
ids.empresa = await criarUsuario('empresa@teste.local', { role: 'company', display_name: 'Empresa Pagante' });
ids.profFree = await criarUsuario('free@teste.local', { role: 'professional', display_name: 'Prof Free' });
ids.pendente = await criarUsuario('pend@teste.local', { role: 'professional', display_name: 'Prof Pendente' });
ids.profTeste = await criarUsuario('profteste@teste.local', { role: 'professional', display_name: 'Prof de Teste' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
await db.query(`update public.profiles set verification_status = 'pending' where id = $1`, [ids.pendente]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.profTeste]);
// Pagantes: assinatura pro ativa em production (escrita de service role).
const pagar = async (uid, plano) => db.query(
  `update public.subscriptions
   set plan = $2, status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`,
  [uid, plano]);
await pagar(ids.prof, 'pro_professional');
await pagar(ids.empresa, 'pro_company');
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

// ---------- seed do curador ----------
{
  const { rows } = await db.query(
    `select nome, qualificacao, registro, ativo from public.curators where nome = 'Fábio Gentil'`);
  ok(rows.length === 1 && rows[0].qualificacao === 'Técnico de Segurança do Trabalho'
    && rows[0].registro === null && rows[0].ativo === true,
    'seed: Fabio presente, qualificado, registro pendente (null)');
}
const idFabio = (await db.query(`select id from public.curators where nome = 'Fábio Gentil'`)).rows[0].id;

// ---------- admin monta trilhas via RLS ----------
const criarTrilha = (titulo, audience, kind, published, isTest = false) =>
  comoUsuario(ids.admin,
    `insert into public.trails (titulo, descricao, audience, kind, published, is_test, ordem)
     values ($1, 'desc', $2, $3, $4, $5, 0) returning id`,
    [titulo, audience, kind, published, isTest], true);

let r = await criarTrilha('NR-35 Trabalho em Altura', 'professional', 'certified', true);
ok(r.rows.length === 1 && !r.erro, 'admin cria trilha certified de profissional');
const idTrailProf = r.rows[0].id;
r = await criarTrilha('Gestao de SST', 'company', 'open', true);
const idTrailEmp = r.rows[0].id;
r = await criarTrilha('Rascunho', 'both', 'open', false);
const idRascunho = r.rows[0].id;
r = await criarTrilha('Trilha de Teste', 'professional', 'open', true, true);
const idTrailTeste = r.rows[0].id;

// secoes da trilha de profissional: youtube + pdf validos
r = await comoUsuario(ids.admin,
  `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
   values ($1, 1, 'Aula 1', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
          ($1, 2, 'Apostila', 'pdf', '11111111-1111-1111-1111-111111111111.pdf')`,
  [idTrailProf], true);
ok(!r.erro, 'admin cria secoes youtube e pdf');

// checks de conteudo
r = await comoUsuario(ids.admin,
  `insert into public.trail_sections (trail_id, titulo, content_type, conteudo)
   values ($1, 'Errada', 'pdf', 'https://exemplo.com/apostila.pdf')`,
  [idTrailProf]);
ok(!!r.erro, 'secao pdf com URL rejeitada pelo check');
r = await comoUsuario(ids.admin,
  `insert into public.trail_sections (trail_id, titulo, content_type, conteudo)
   values ($1, 'Errada', 'link', '11111111-1111-1111-1111-111111111111.pdf')`,
  [idTrailProf]);
ok(!!r.erro, 'secao link com path de storage rejeitada pelo check');

// junction: Fabio cura a trilha de profissional; segundo curador so no rascunho
r = await comoUsuario(ids.admin,
  `insert into public.curators (nome, qualificacao) values ('Curadora Dois', 'Engenheira de Seguranca') returning id`,
  [], true);
ok(r.rows.length === 1 && !r.erro, 'admin cria segundo curador');
const idCuradora2 = r.rows[0].id;
r = await comoUsuario(ids.admin,
  `insert into public.trail_curators (trail_id, curator_id) values ($1, $2), ($3, $2)`,
  [idTrailProf, idFabio, idRascunho], true);
ok(!r.erro, 'admin vincula Fabio a trilhas');
r = await comoUsuario(ids.admin,
  `insert into public.trail_curators (trail_id, curator_id) values ($1, $2)`,
  [idRascunho, idCuradora2], true);
ok(!r.erro, 'admin vincula curadora so ao rascunho');
r = await comoUsuario(ids.admin,
  `insert into public.trail_curators (trail_id, curator_id) values ($1, $2)`,
  [idTrailProf, idFabio]);
ok(!!r.erro, 'junction duplicada rejeitada (PK)');

// ---------- visitante (anon) nao le nada ----------
await db.query('begin');
await db.query('set local role anon');
let erroAnon = null;
try { await db.query('select id from public.trails'); } catch (e) { erroAnon = e; }
await db.query('rollback');
ok(!!erroAnon, 'visitante (anon) nao le trilhas (sem grant)');

// ---------- leitura por perfil ----------
const listar = (uid, tabela) => comoUsuario(uid, `select id from public.${tabela} order by 1`);

r = await listar(ids.profFree, 'trails');
ok(r.rows.length === 0, 'membro FREE nao ve trilha publicada');
r = await listar(ids.pendente, 'trails');
ok(r.rows.length === 0, 'membro pendente nao ve trilha publicada');

r = await listar(ids.prof, 'trails');
let vistos = r.rows.map((x) => x.id);
ok(vistos.includes(idTrailProf), 'prof pagante ve trilha de profissional');
ok(!vistos.includes(idTrailEmp), 'prof pagante NAO ve trilha de empresa');
ok(!vistos.includes(idRascunho), 'prof pagante NAO ve rascunho');
ok(!vistos.includes(idTrailTeste), 'trilha is_test escondida de membro comum');

r = await listar(ids.empresa, 'trails');
vistos = r.rows.map((x) => x.id);
ok(vistos.includes(idTrailEmp) && !vistos.includes(idTrailProf), 'empresa pagante ve so trilha de empresa');

r = await listar(ids.profTeste, 'trails');
vistos = r.rows.map((x) => x.id);
ok(vistos.includes(idTrailTeste) && vistos.includes(idTrailProf), 'perfil is_test pagante ve trilha de teste e as normais');

r = await listar(ids.admin, 'trails');
ok(r.rows.length === 4, 'admin ve tudo, inclusive rascunho');

// ---------- secoes seguem a trilha ----------
r = await comoUsuario(ids.prof, 'select id from public.trail_sections where trail_id = $1', [idTrailProf]);
ok(r.rows.length === 2, 'prof pagante ve as 2 secoes da trilha visivel');
r = await listar(ids.profFree, 'trail_sections');
ok(r.rows.length === 0, 'membro FREE nao ve secoes');

// ---------- curadores ----------
r = await listar(ids.prof, 'curators');
vistos = r.rows.map((x) => x.id);
ok(vistos.includes(idFabio), 'prof pagante ve Fabio (curador de trilha visivel)');
ok(!vistos.includes(idCuradora2), 'curadora so de rascunho NAO aparece para membro');
r = await listar(ids.admin, 'curators');
ok(r.rows.length === 2, 'admin ve todos os curadores');
r = await listar(ids.profFree, 'curators');
ok(r.rows.length === 0, 'membro FREE nao ve curadores');

// ---------- escrita so admin ----------
r = await comoUsuario(ids.prof,
  `insert into public.trails (titulo, audience, kind) values ('Invasao', 'both', 'open')`);
ok(!!r.erro, 'membro pagante NAO cria trilha');

// ---------- cascade ----------
r = await comoUsuario(ids.admin, `delete from public.trails where id = $1`, [idRascunho], true);
ok(!r.erro, 'admin exclui rascunho');
{
  const { rows } = await db.query(
    `select (select count(*) from public.trail_sections where trail_id = $1) as secoes,
            (select count(*) from public.trail_curators where trail_id = $1) as junctions`,
    [idRascunho]);
  ok(Number(rows[0].secoes) === 0 && Number(rows[0].junctions) === 0, 'delete da trilha cascateia secoes e junction');
}

console.log(`\n${pass} ok, ${fail} falhas`);
await db.close();
process.exit(fail ? 1 : 0);
