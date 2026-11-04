// Teste local (PGlite) da atribuicao de treinamentos a funcionarios.
//
// Regressao do bug 42P17 encontrado em producao em 04/11/2026: a policy de
// insert em team_training_assignments consultava public.trainings (RLS) e
// trainings_employee_select consulta team_training_assignments de volta,
// fechando um ciclo - TODA atribuicao falhava com 500
// "infinite recursion detected in policy". A migracao
// 20261108060000_fix_recursao_atribuicao.sql introduz o helper security
// definer private.training_publicada e reescreve a policy.
//
// Contrato verificado (cadeia REAL de migracoes, role authenticated):
//   - empresa pagante adiciona funcionario e ATRIBUI treinamento publicado
//     sem erro de recursao (a regressao em si);
//   - conta criada depois do convite e vinculada pelo trigger;
//   - empresa free nao adiciona funcionario nem atribui;
//   - treinamento em rascunho nao pode ser atribuido;
//   - funcionario ve a propria atribuicao; terceiro nao ve.
//
// Como rodar:  npm run test:atribuicao
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
ok(true, `cadeia real aplicada (${arquivos.length} migracoes, inclui fix 42P17)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ids = {};
ids.admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
ids.empresa = await criarUsuario('empresa@teste.local', { role: 'company', display_name: 'Empresa Pagante' });
ids.empresaFree = await criarUsuario('free@teste.local', { role: 'company', display_name: 'Empresa Free' });
ids.terceiro = await criarUsuario('terceiro@teste.local', { role: 'professional', display_name: 'Terceiro' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);

// Empresa pagante: o cadastro ja cria a linha de subscriptions; promove a
// pro_company ativa em production (escrita direta como service role faria).
await db.query(
  `update public.subscriptions
   set plan = 'pro_company', status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`,
  [ids.empresa]);

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

// Admin cadastra treinamentos via RLS (publicado + rascunho)
let r = await comoUsuario(ids.admin,
  `insert into public.trainings (title, audience, status, created_by, link_url)
   values ('Trein. empresa publicado', 'company', 'published', $1, 'https://exemplo.com/material') returning id`,
  [ids.admin], true);
ok(r.rows.length === 1 && !r.erro, 'admin cria treinamento publicado');
const idTrein = r.rows[0].id;
r = await comoUsuario(ids.admin,
  `insert into public.trainings (title, audience, status, created_by, link_url)
   values ('Trein. rascunho', 'company', 'draft', $1, 'https://exemplo.com/rascunho') returning id`,
  [ids.admin], true);
ok(r.rows.length === 1 && !r.erro, 'admin cria treinamento rascunho');
const idRascunho = r.rows[0].id;

// ---------- empresa pagante monta a equipe ----------
r = await comoUsuario(ids.empresa,
  `insert into public.company_employees (company_id, email, display_name)
   values ($1, 'func@teste.local', 'Func') returning id`,
  [ids.empresa], true);
ok(r.rows.length === 1 && !r.erro, 'empresa pagante adiciona funcionario');
const idEmployeeRow = r.rows[0]?.id;

// Conta do funcionario criada DEPOIS do convite: trigger vincula na hora
ids.func = await criarUsuario('func@teste.local', { role: 'employee', display_name: 'Func' });
{
  const { rows } = await db.query(
    `select employee_profile_id from public.company_employees where id = $1`, [idEmployeeRow]);
  ok(rows[0]?.employee_profile_id === ids.func, 'trigger vincula conta existente ao convite');
}

// ---------- A regressao: atribuir treinamento nao pode dar 42P17 ----------
r = await comoUsuario(ids.empresa,
  `insert into public.team_training_assignments (company_employee_id, training_id)
   values ($1, $2) returning id`,
  [idEmployeeRow, idTrein], true);
ok(!r.erro && r.rows.length === 1,
  'empresa atribui treinamento publicado SEM recursao 42P17'
    + (r.erro ? ` (erro: ${r.erro.message})` : ''));
const idAssignment = r.rows[0]?.id;

// ---------- limites do contrato ----------
r = await comoUsuario(ids.empresaFree,
  `insert into public.company_employees (company_id, email) values ($1, 'x@teste.local')`,
  [ids.empresaFree]);
ok(!!r.erro, 'empresa free NAO adiciona funcionario');

r = await comoUsuario(ids.empresa,
  `insert into public.team_training_assignments (company_employee_id, training_id)
   values ($1, $2)`,
  [idEmployeeRow, idRascunho]);
ok(!!r.erro, 'rascunho NAO pode ser atribuido');

r = await comoUsuario(ids.func,
  `select id from public.team_training_assignments where id = $1`, [idAssignment]);
ok(r.rows.length === 1, 'funcionario ve a propria atribuicao');

r = await comoUsuario(ids.terceiro,
  `select id from public.team_training_assignments where id = $1`, [idAssignment]);
ok(r.rows.length === 0, 'terceiro NAO ve atribuicao alheia');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
