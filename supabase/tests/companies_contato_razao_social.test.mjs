// Teste local (PGlite) do GRANT de UPDATE em companies.razao_social.
//
// Regressao do bug de producao: a etapa de contato do Publicar Demanda
// faz updateCompany gravando razao_social e falhava com
//   ERROR 42501: permission denied for table companies
// porque o grant de UPDATE do unify e por coluna e nao incluia
// razao_social (criada depois, em 20261029230000).
//
// Contrato verificado:
//   - empresa DONA atualiza razao_social na propria linha (positivo);
//   - outra empresa NAO atualiza (0 linhas pela policy companies_update);
//   - profissional NAO atualiza;
//   - anon NAO atualiza (sem grant e sem policy);
//   - grant segue POR COLUNA: dona nao atualiza coluna fora da lista
//     (employee_count e concedida; profile_id nao e).
//
// Como rodar:  npm run test:companies-contato
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

// ---------- shims (mesmos de demands_policy.test.mjs) ----------
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
ok(true, `cadeia real aplicada (${arquivos.length} migracoes)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const dona = await criarUsuario('dona@teste.local', {
  role: 'company', display_name: 'Empresa Dona', cnpj: '00.000.000/0001-01',
});
const outra = await criarUsuario('outra@teste.local', {
  role: 'company', display_name: 'Empresa Outra', cnpj: '00.000.000/0001-02',
});
const prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Profissional' });

const comoUsuario = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin');
  await db.query(`set local role ${role}`);
  if (uid) {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  }
  let r;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
  await db.query('commit');
  return r;
};
const linhasAfetadas = (r) => r.affectedRows ?? r.rowCount ?? 0;

// ---------- positivo: dona atualiza razao_social ----------
// Antes da migracao 20261031030000 este update falhava com 42501
// (permission denied for table companies) mesmo para a dona.
let erroDona = null;
let linhasDona = 0;
try {
  const r = await comoUsuario(dona,
    `update public.companies set razao_social = 'Empresa Dona Ltda' where profile_id = $1`, [dona]);
  linhasDona = linhasAfetadas(r);
} catch (e) { erroDona = e; }
ok(erroDona === null && linhasDona === 1,
  `dona atualiza razao_social na propria linha (antes: 42501)${erroDona ? ' -> ' + erroDona.message : ''}`);

const lido = await comoUsuario(dona,
  `select razao_social from public.companies where profile_id = $1`, [dona]);
ok(lido.rows[0]?.razao_social === 'Empresa Dona Ltda', 'valor gravado persiste');

// ---------- negativo: terceiros ----------
const updOutra = await comoUsuario(outra,
  `update public.companies set razao_social = 'invadido' where profile_id = $1`, [dona]);
ok(linhasAfetadas(updOutra) === 0, 'outra empresa NAO atualiza razao_social alheia (0 linhas pela policy)');

const updProf = await comoUsuario(prof,
  `update public.companies set razao_social = 'invadido' where profile_id = $1`, [dona]);
ok(linhasAfetadas(updProf) === 0, 'profissional NAO atualiza razao_social de empresa');

let erroAnon = null;
let linhasAnon = 0;
try {
  const r = await comoUsuario(null,
    `update public.companies set razao_social = 'anon' where profile_id = $1`, [dona], 'anon');
  linhasAnon = linhasAfetadas(r);
} catch (e) { erroAnon = e; }
ok(erroAnon !== null || linhasAnon === 0, 'anon NAO atualiza razao_social (sem grant e sem policy)');

// ---------- grant segue por coluna ----------
const updConcedida = await comoUsuario(dona,
  `update public.companies set employee_count = '11-50' where profile_id = $1`, [dona]);
ok(linhasAfetadas(updConcedida) === 1, 'coluna ja concedida (employee_count) continua atualizavel');

let erroColuna = null;
try {
  await comoUsuario(dona,
    `update public.companies set profile_id = gen_random_uuid() where profile_id = $1`, [dona]);
} catch (e) { erroColuna = e; }
ok(erroColuna !== null && /permission denied/i.test(erroColuna.message),
  'coluna fora da lista de grant (profile_id) segue NEGADA para a dona');

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
