// Teste local (PGlite) das policies de demands no ciclo de vida da empresa.
//
// Roda a cadeia REAL de migracoes (supabase/migrations/*.sql) sobre Postgres
// embarcado, com os mesmos shims de auth/storage de search_companies.test.mjs,
// e exercita UPDATE/INSERT/SELECT como role authenticated com claims de JWT
// de usuarios distintos — a mesma avaliacao de policy que o PostgREST faz.
//
// Contrato verificado:
//   - empresa dona insere e atualiza a propria demanda (conteudo e status);
//   - outra empresa NAO atualiza (0 linhas pela policy demands_update);
//   - profissional NAO atualiza nem insere demanda;
//   - anon nao atualiza;
//   - vitrine publica (select de outra conta) so ve demanda 'active':
//     concluida/cancelada sai da vitrine e fica no historico da dona;
//   - guarda atomica usada pelo app (UPDATE ... AND status='active') faz um
//     formulario aberto sobre demanda ja encerrada afetar 0 linhas, sem
//     sobrescrever o encerramento;
//   - DOCUMENTADO: a policy deixa a dona reabrir demanda encerrada (o app
//     nao oferece esse caminho); endurecer isso no banco exige migracao.
//
// Como rodar:  npm run test:demands
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
ok(true, `cadeia real aplicada (${arquivos.length} migracoes)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const dona = await criarUsuario('dona@teste.local', { role: 'company', display_name: 'Empresa Dona' });
const outra = await criarUsuario('outra@teste.local', { role: 'company', display_name: 'Empresa Outra' });
const prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Profissional' });
const admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });

// Executa como role/claims especificos (mesma avaliacao do PostgREST).
// COMMIT (nao rollback): o cenario e sequencial — insert, edicoes, cancelamento
// e reabertura dependem do estado deixado pelas operacoes anteriores.
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

// ---------- insert: papeis ----------
const insDona = await comoUsuario(dona,
  `insert into public.demands (company_id, title, description) values ($1, 'PGR sede', 'desc') returning id`,
  [dona]);
ok(insDona.rows.length === 1, 'empresa insere a propria demanda');
const demandaId = insDona.rows[0].id;

let erroInsert = null;
try {
  await comoUsuario(prof,
    `insert into public.demands (company_id, title, description) values ($1, 'X', 'y')`, [prof]);
} catch (e) { erroInsert = e; }
ok(erroInsert !== null, 'profissional NAO insere demanda (policy exige papel company)');

erroInsert = null;
try {
  await comoUsuario(dona,
    `insert into public.demands (company_id, title, description) values ($1, 'X', 'y')`, [outra]);
} catch (e) { erroInsert = e; }
ok(erroInsert !== null, 'empresa NAO insere demanda em nome de outra');

// ---------- update: dono x terceiros ----------
const updOutra = await comoUsuario(outra,
  `update public.demands set title = 'invadido' where id = $1`, [demandaId]);
ok(linhasAfetadas(updOutra) === 0, 'outra empresa NAO edita a demanda (0 linhas pela policy)');

const updProf = await comoUsuario(prof,
  `update public.demands set status = 'cancelled' where id = $1`, [demandaId]);
ok(linhasAfetadas(updProf) === 0, 'profissional NAO conclui/cancela demanda alheia');

let erroAnon = null;
let linhasAnon = 0;
try {
  const r = await comoUsuario(null,
    `update public.demands set title = 'anon' where id = $1`, [demandaId], 'anon');
  linhasAnon = linhasAfetadas(r);
} catch (e) { erroAnon = e; }
ok(erroAnon !== null || linhasAnon === 0, 'anon NAO atualiza demanda (sem grant e sem policy)');

const updDona = await comoUsuario(dona,
  `update public.demands set title = 'PGR sede v2' where id = $1 and company_id = auth.uid() and status = 'active'`,
  [demandaId]);
ok(linhasAfetadas(updDona) === 1, 'dona edita a propria demanda ativa (guarda atomica do app)');

// ---------- vitrine: concluida/cancelada sai do publico ----------
const vitrineAntes = await comoUsuario(prof,
  `select id from public.demands where id = $1`, [demandaId]);
ok(vitrineAntes.rows.length === 1, 'demanda ativa aparece na vitrine para outras contas');

const updCancela = await comoUsuario(dona,
  `update public.demands set status = 'cancelled' where id = $1 and status = 'active'`, [demandaId]);
ok(linhasAfetadas(updCancela) === 1, 'dona cancela demanda ativa');

const vitrineDepois = await comoUsuario(prof,
  `select id from public.demands where id = $1`, [demandaId]);
ok(vitrineDepois.rows.length === 0, 'demanda cancelada SAI da vitrine publica');

const historicoDona = await comoUsuario(dona,
  `select id, status from public.demands where id = $1`, [demandaId]);
ok(historicoDona.rows.length === 1 && historicoDona.rows[0].status === 'cancelled',
  'demanda cancelada fica no historico da dona');

// ---------- concorrencia: formulario aberto nao sobrescreve encerramento ----------
const updTardio = await comoUsuario(dona,
  `update public.demands set title = 'edicao tardia' where id = $1 and company_id = auth.uid() and status = 'active'`,
  [demandaId]);
ok(linhasAfetadas(updTardio) === 0, 'guarda atomica: edicao tardia sobre demanda encerrada afeta 0 linhas');

const tituloFinal = await db.query(`select title from public.demands where id = $1`, [demandaId]);
ok(tituloFinal.rows[0].title === 'PGR sede v2', 'encerramento preservado, sem sobrescrita');

// ---------- documentacao de comportamento da policy ----------
const updReabre = await comoUsuario(dona,
  `update public.demands set status = 'active' where id = $1`, [demandaId]);
ok(linhasAfetadas(updReabre) === 1,
  'DOCUMENTADO: policy permite a dona reabrir; app nao oferece, endurecer no banco exige migracao');

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
