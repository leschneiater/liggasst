// Teste local (PGlite) da migracao de assinatura (versao de testes, sandbox).
//
// Roda a cadeia REAL de migracoes (supabase/migrations/*.sql, incluindo
// 20261101190000_assinatura_plano.sql) sobre Postgres embarcado, com os
// mesmos shims de auth/storage de demands_policy.test.mjs, e verifica:
//   - a cadeia inteira aplica sem erro (a migracao nova e compativel com as
//     anteriores, incluindo o schema private e o trigger de cadastro);
//   - conta nova ganha linha gratuita em subscriptions (trigger proprio em
//     public.profiles, sem tocar na private.handle_new_user);
//   - RLS: a conta le o proprio plano e NAO le o de terceiros; anon nao le;
//   - sem policy de escrita: authenticated NAO insere/atualiza/apaga plano
//     (escrita so via service role, como no webhook/conciliador);
//   - check constraints: plano fora da lista e rejeitado;
//   - subscription_payments e asaas_webhook_events sem acesso a authenticated.
//
// Como rodar:  node supabase/tests/assinatura_policy.test.mjs
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
ok(arquivos.includes('20261101190000_assinatura_plano.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo assinatura)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ana = await criarUsuario('ana@teste.local', { role: 'professional', display_name: 'Ana' });
const beto = await criarUsuario('beto@teste.local', { role: 'professional', display_name: 'Beto' });

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

// ---------- trigger: conta nova comeca gratuita ----------
const { rows: subAna } = await db.query(
  `select plan, status, environment from public.subscriptions where profile_id = $1`, [ana]);
ok(subAna.length === 1 && subAna[0].plan === 'free' && subAna[0].status === 'active',
  'conta nova ganha plano free automaticamente (trigger proprio)');
ok(subAna[0].environment === 'sandbox', 'ambiente default da assinatura e sandbox');

// ---------- RLS: leitura ----------
const { rows: leituraPropria } = await comoUsuario(ana,
  `select plan from public.subscriptions where profile_id = $1`, [ana]);
ok(leituraPropria.length === 1, 'a conta le o proprio plano');

const { rows: leituraAlheia } = await comoUsuario(ana,
  `select plan from public.subscriptions where profile_id = $1`, [beto]);
ok(leituraAlheia.length === 0, 'a conta NAO le o plano de terceiros');

let erroAnon = null, linhasAnon = -1;
try {
  const r = await comoUsuario(null, `select plan from public.subscriptions`, [], 'anon');
  linhasAnon = r.rows.length;
} catch (e) { erroAnon = e; }
ok(erroAnon !== null || linhasAnon === 0,
  'anon nao le nenhum plano (sem grant, ou 0 linhas pela RLS)');

// ---------- RLS: escrita bloqueada para authenticated ----------
let erro = null;
try {
  await comoUsuario(ana,
    `insert into public.subscriptions (profile_id, plan) values ($1, 'pro_professional')`, [beto]);
} catch (e) { erro = e; }
ok(erro !== null, 'authenticated NAO insere assinatura (sem policy de insert)');

let erroUpd = null, linhasUpd = -1;
try {
  const r = await comoUsuario(ana,
    `update public.subscriptions set plan = 'pro_professional' where profile_id = $1`, [ana]);
  linhasUpd = linhasAfetadas(r);
} catch (e) { erroUpd = e; }
ok(erroUpd !== null || linhasUpd === 0,
  'authenticated NAO se autopromove a plano pago (sem grant de update)');

let erroDel = null, linhasDel = -1;
try {
  const r = await comoUsuario(ana,
    `delete from public.subscriptions where profile_id = $1`, [ana]);
  linhasDel = linhasAfetadas(r);
} catch (e) { erroDel = e; }
ok(erroDel !== null || linhasDel === 0,
  'authenticated NAO apaga a propria assinatura (sem grant de delete)');

// ---------- check constraints ----------
erro = null;
try {
  await db.query(
    `insert into public.subscriptions (profile_id, plan)
     values (gen_random_uuid(), 'plano_inventado')`);
} catch (e) { erro = e; }
ok(erro !== null, 'plano fora da lista (free/pro_professional/pro_company) e rejeitado');

erro = null;
try {
  await db.query(
    `insert into public.subscriptions (profile_id, status)
     values (gen_random_uuid(), 'none')`);
} catch (e) { erro = e; }
ok(erro !== null, 'status fora da lista e rejeitado');

// ---------- tabelas internas sem acesso a authenticated ----------
erro = null;
try {
  await comoUsuario(ana, `insert into public.asaas_webhook_events (event_key, event_type, payload) values ('e1','x','{}')`);
} catch (e) { erro = e; }
ok(erro !== null, 'authenticated NAO grava evento de webhook (auditoria interna)');

erro = null;
try {
  await comoUsuario(ana,
    `insert into public.subscription_payments (asaas_payment_id, profile_id, asaas_subscription_id, period_start, period_end)
     values ('pay_x', $1, 'sub_x', '2026-11-02', '2026-12-02')`, [ana]);
} catch (e) { erro = e; }
ok(erro !== null, 'authenticated NAO grava periodo pago (tabela interna do webhook)');

// ---------- escrita via service role funciona (papel do webhook) ----------
await db.query(
  `update public.subscriptions set plan = 'pro_professional', status = 'active',
     current_period_end = '2026-12-02', asaas_subscription_id = 'sub_x',
     last_paid_payment_id = 'pay_x', updated_at = now()
   where profile_id = $1`, [ana]);
const { rows: promovida } = await db.query(
  `select plan, status from public.subscriptions where profile_id = $1`, [ana]);
ok(promovida[0].plan === 'pro_professional' && promovida[0].status === 'active',
  'service role (webhook) promove a conta a plano pago');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
