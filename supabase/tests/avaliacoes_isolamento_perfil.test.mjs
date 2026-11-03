// Teste local (PGlite) do isolamento de avaliacoes_do_perfil e
// avaliacoes_resumo (migracao 20261103000000_avaliacoes_perfil_isolamento.sql).
//
// Contrato verificado: o perfil avaliado precisa estar approved e, se for
// is_test, so quem esta no gate de teste (private.messaging_allowlist) recebe
// avaliacoes e resumo. Profissional real aprovado segue visivel para todos
// (inclusive anon). Perfil que deixa de ser approved depois de avaliado some;
// reaprovar reexpoe. Grants anon+authenticated preservados.
//
// Como rodar:  node supabase/tests/avaliacoes_isolamento_perfil.test.mjs
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

// ---------- shims ----------
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
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
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
ok(arquivos.includes('20261103000000_avaliacoes_perfil_isolamento.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo isolamento de avaliacoes)`);

// ---------- fixtures (todos ficticios) ----------
const cu = async (email, meta) => (await db.query(
  `insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id`,
  [email, JSON.stringify(meta)])).rows[0].id;
const emp = await cu('e@x.local', { role: 'company', display_name: 'Empresa Ficticia' });
const proOk = await cu('p@x.local', { role: 'professional', display_name: 'Prof Aprovado' });
const proTest = await cu('pt@x.local', { role: 'professional', display_name: 'Prof Teste' });
const comum = await cu('c@x.local', { role: 'professional', display_name: 'Comum' });
const tester = await cu('t@x.local', { role: 'professional', display_name: 'Tester' });
await db.query(`update public.profiles set verification_status='approved' where id in ($1,$2,$3,$4,$5)`,
  [emp, proOk, proTest, comum, tester]);
await db.query(`update public.profiles set is_test=true where id in ($1,$2)`, [proTest, tester]);
await db.query(`insert into private.messaging_allowlist (user_id) values ($1)`, [tester]);

const cm = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin');
  await db.query(`set local role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid })]);
  let r;
  try { r = await db.query(sql, params); } catch (e) { await db.query('rollback'); throw e; }
  await db.query('commit');
  return r;
};

// contrato concluido + avaliacao dos dois lados (revelada) para proOk e proTest
for (const pid of [proOk, proTest]) {
  const c = (await cm(emp,
    `insert into public.contracts (company_id, professional_id, demand_id, title, amount)
     values ($1,$2,null,'Contrato ficticio',100) returning id`, [emp, pid])).rows[0].id;
  await cm(pid, `select public.responder_contrato($1,'aceitar')`, [c]);
  await cm(emp, `select public.concluir_contrato($1)`, [c]);
  await cm(emp, `select public.avaliar_contrato($1::uuid,5::smallint,'comentario ficticio')`, [c]);
  await cm(pid, `select public.avaliar_contrato($1::uuid,4::smallint,null)`, [c]);
}

const quem = [['anon', null, 'anon'], ['comum', comum, 'authenticated'], ['empresa', emp, 'authenticated']];
const conta = async (pid, u, role) => ({
  a: (await cm(u, `select id from public.avaliacoes_do_perfil($1::uuid)`, [pid], role)).rows.length,
  r: Number((await cm(u, `select total from public.avaliacoes_resumo($1::uuid)`, [pid], role)).rows[0]?.total ?? 0),
});

// ---------- perfil is_test ----------
for (const [nome, u, role] of quem) {
  const t = await conta(proTest, u, role);
  ok(t.a === 0 && t.r === 0, `${nome} NAO recebe avaliacoes/resumo de perfil is_test`);
  const o = await conta(proOk, u, role);
  ok(o.a === 1 && o.r === 1, `${nome} segue vendo avaliacoes de profissional real aprovado`);
}
const tt = await conta(proTest, tester, 'authenticated');
ok(tt.a === 1 && tt.r === 1, 'testador (allowlist) ainda ve avaliacoes de perfil is_test');

// ---------- aprovado -> nao aprovado depois das avaliacoes ----------
// Operacao administrativa (sem uid), igual ao SQL editor; os guards de
// usuario sobre verification_status nao sao contornados.
for (const novo of ['rejected', 'pending']) {
  await db.query(`update public.profiles set verification_status=$2 where id=$1`, [proOk, novo]);
  for (const [nome, u, role] of quem) {
    const x = await conta(proOk, u, role);
    ok(x.a === 0 && x.r === 0, `perfil que virou ${novo} apos avaliacoes some para ${nome}`);
  }
  const xt = await conta(proOk, tester, 'authenticated');
  ok(xt.a === 0 && xt.r === 0, `perfil ${novo} tambem some para o testador (exige approved)`);
}
await db.query(`update public.profiles set verification_status='approved' where id=$1`, [proOk]);
const volta = await conta(proOk, null, 'anon');
ok(volta.a === 1 && volta.r === 1, 'reaprovar o perfil reexpoe as avaliacoes');

// ---------- grants ----------
const g = (await db.query(
  `select has_function_privilege('anon',p.oid,'execute') a, has_function_privilege('authenticated',p.oid,'execute') b
   from pg_proc p join pg_namespace s on s.oid=p.pronamespace
   where s.nspname='public' and p.proname in ('avaliacoes_do_perfil','avaliacoes_resumo')`)).rows;
ok(g.length === 2 && g.every((x) => x.a && x.b), 'grants anon+authenticated preservados (vitrine publica)');

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
