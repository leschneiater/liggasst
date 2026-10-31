// Teste local (PGlite) do isolamento de demandas de TESTE na vitrine
// (migracao 20261031020000_demandas_isolamento_teste.sql).
//
// Mesma tecnica dos demais testes desta pasta: cadeia REAL de migracoes
// sobre Postgres embarcado com shims minimos de auth/storage, exercitada
// como role authenticated com claims de JWT de usuarios distintos.
//
// Contrato verificado:
//   - demanda de empresa de TESTE (profiles.is_test) NAO aparece na vitrine
//     (status='active') para contas comuns autenticadas;
//   - aparece para: a propria dona, o admin e conta no gate de teste
//     (private.messaging_allowlist);
//   - demandas de contas REAIS seguem visiveis na vitrine (regressao);
//   - a derivacao e ao vivo: marcar is_test esconde demanda ja publicada,
//     desmarcar reexpoem;
//   - demanda de teste em outro status (in_progress) tambem fica fora da
//     vitrine de contas comuns.
//
// Como rodar:  node supabase/tests/demands_isolamento_teste.test.mjs
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
ok(arquivos.includes('20261031020000_demandas_isolamento_teste.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo isolamento de demandas teste)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const empresaReal = await criarUsuario('real@empresa.local', { role: 'company', display_name: 'Empresa Real' });
const empresaTeste = await criarUsuario('teste@empresa.local', { role: 'company', display_name: '[TESTE] Empresa' });
const profComum = await criarUsuario('prof@real.local', { role: 'professional', display_name: 'Profissional Real' });
const profTester = await criarUsuario('tester@prof.local', { role: 'professional', display_name: '[TESTE] Profissional' });
const admin = await criarUsuario('admin@real.local', { role: 'admin', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
// Flag de teste e gate: operacao administrativa (auth.uid() nulo aqui,
// mesmo caminho do SQL editor do Supabase usado em producao).
await db.query(`update public.profiles set is_test = true where id in ($1, $2)`, [empresaTeste, profTester]);
await db.query(`insert into private.messaging_allowlist (user_id) values ($1), ($2)`, [empresaTeste, profTester]);

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

// ---------- cenario base: demandas ativas ----------
const dReal = (await comoUsuario(empresaReal,
  `insert into public.demands (company_id, title, description) values ($1, 'PGR real', 'desc') returning id`,
  [empresaReal])).rows[0].id;
const dTeste = (await comoUsuario(empresaTeste,
  `insert into public.demands (company_id, title, description) values ($1, '[TESTE] PGR', 'desc') returning id`,
  [empresaTeste])).rows[0].id;
ok(dReal && dTeste, 'empresas real e de teste inserem as proprias demandas ativas');

// ---------- regressao: demanda real segue na vitrine ----------
const vRealProf = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dReal]);
ok(vRealProf.rows.length === 1, 'demanda de empresa REAL segue visivel na vitrine para profissional comum');

// ---------- isolamento: demanda de teste some da vitrine ----------
const vTesteProf = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteProf.rows.length === 0, 'demanda de empresa TESTE NAO aparece para profissional comum');

const vTesteOutraEmpresa = await comoUsuario(empresaReal,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteOutraEmpresa.rows.length === 0, 'demanda de empresa TESTE NAO aparece para empresa real');

const vitrineGeral = await comoUsuario(profComum,
  `select id from public.demands where status = 'active'`);
ok(vitrineGeral.rows.length === 1 && vitrineGeral.rows[0].id === dReal,
  'listagem geral da vitrine so expoe a demanda real');

// ---------- excecoes: dona, gate e admin enxergam ----------
const vTesteDona = await comoUsuario(empresaTeste,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteDona.rows.length === 1, 'empresa de teste ve a propria demanda');

const vTesteGate = await comoUsuario(profTester,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteGate.rows.length === 1, 'conta no gate de teste ve a demanda de teste (para valida-la)');

const vTesteAdmin = await comoUsuario(admin,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteAdmin.rows.length === 1, 'admin ve a demanda de teste (moderacao)');

// ---------- derivacao ao vivo da flag ----------
const antesMarcar = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dReal]);
ok(antesMarcar.rows.length === 1, 'demanda real visivel antes de marcar a dona como teste');
await db.query(`update public.profiles set is_test = true where id = $1`, [empresaReal]);
const depoisMarcar = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dReal]);
ok(depoisMarcar.rows.length === 0, 'marcar is_test ESCONDE na hora demanda ja publicada');
await db.query(`update public.profiles set is_test = false where id = $1`, [empresaReal]);
const depoisDesmarcar = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dReal]);
ok(depoisDesmarcar.rows.length === 1, 'desmarcar is_test reexpoem a demanda');

// ---------- teste em andamento tambem fora da vitrine comum ----------
await db.query(`update public.demands set status = 'in_progress' where id = $1`, [dTeste]);
const vTesteAndamento = await comoUsuario(profComum,
  `select id from public.demands where id = $1`, [dTeste]);
ok(vTesteAndamento.rows.length === 0, 'demanda de teste in_progress tambem invisivel a conta comum');
const vTesteAndamentoGate = await comoUsuario(profTester,
  `select id, status from public.demands where id = $1`, [dTeste]);
ok(vTesteAndamentoGate.rows.length === 0,
  'in_progress fora da vitrine ate para o gate: paridade com demandas reais (detalhe chega ao profissional via RPC listar_contratos, security definer)');

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
