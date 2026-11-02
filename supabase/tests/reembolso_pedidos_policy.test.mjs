// Teste local (PGlite) da migracao 20261102130000_reembolso_pedidos.sql.
// Roda a cadeia real. Verifica RLS, ownership da cobranca, imutabilidade pelo
// cliente e unicidade (idempotencia). Nada remoto.
// Como rodar: node supabase/tests/reembolso_pedidos_policy.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const dirMigrations = path.join(raiz, '..', 'migrations');
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log(`ok   ${n}`); } else { fail++; console.log(`FALHOU ${n}`); } };

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`);
const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
for (const a of arquivos) await db.exec(readFileSync(path.join(dirMigrations, a), 'utf8').replace(/create extension if not exists pgcrypto;/i, ''));
ok(arquivos.includes('20261102130000_reembolso_pedidos.sql'), `cadeia real aplicada (${arquivos.length} migracoes)`);

const criar = async (email, meta) => (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id`, [email, JSON.stringify(meta)])).rows[0].id;
const ana = await criar('ana@t.local', { role: 'professional', display_name: 'Ana' });
const beto = await criar('beto@t.local', { role: 'professional', display_name: 'Beto' });
const adm = await criar('adm@t.local', { role: 'professional', display_name: 'Adm' });
await db.query(`update public.profiles set role='admin' where id=$1`, [adm]);
const como = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin'); await db.query(`set local role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid })]);
  let r; try { r = await db.query(sql, params); } catch (e) { await db.query('rollback'); throw e; }
  await db.query('commit'); return r;
};
const erra = async (...a) => { try { await como(...a); return false; } catch { return true; } };
const pag = async (id, prof, st = 'paid') => db.query(
  `insert into public.subscription_payments (asaas_payment_id, profile_id, asaas_subscription_id, period_start, period_end, status) values ($1,$2,'sub_1','2026-11-01','2026-12-01',$3)`, [id, prof, st]);
await pag('pay_ana', ana); await pag('pay_beto', beto); await pag('pay_ana_ref', ana, 'refunded');
const ins = (uid, pay, extra = '') => como(uid, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo${extra ? ',' + extra.split('=')[0] : ''}) values ($1,$2,'motivo'${extra ? ',' + extra.split('=')[1] : ''})`, [uid, pay]);

ok(!(await erra(ana, 'select 1')) && (await ins(ana, 'pay_ana'), true), 'conta solicita reembolso da PROPRIA cobranca paga');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo) values ($1,'pay_beto','x')`, [ana]), 'conta NAO solicita reembolso de cobranca de terceiros');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo) values ($1,'pay_ana','dup')`, [ana]), 'segundo pedido ativo para a mesma cobranca e rejeitado (indice unico)');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo) values ($1,'pay_beto','x')`, [beto]), 'conta NAO insere pedido em nome de outra');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo) values ($1,'pay_ana_ref','x')`, [ana]), 'cobranca ja estornada nao aceita pedido');
await pag('pay_ana2', ana);
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo, status) values ($1,'pay_ana2','x','aprovado')`, [ana]), 'cliente NAO cria pedido ja aprovado');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo, decided_by) values ($1,'pay_ana2','x',$1)`, [ana]), 'cliente NAO preenche decided_by');
ok(await erra(ana, `insert into public.reembolso_pedidos (profile_id, asaas_payment_id, motivo, detalhe) values ($1,'pay_ana2','x','forjado')`, [ana]), 'cliente NAO preenche detalhe');
ok((await como(ana, `select count(*)::int n from public.reembolso_pedidos`)).rows[0].n === 1, 'conta le so o proprio pedido');
ok((await como(beto, `select count(*)::int n from public.reembolso_pedidos`)).rows[0].n === 0, 'outra conta NAO le pedido de terceiros');
ok((await como(adm, `select count(*)::int n from public.reembolso_pedidos`)).rows[0].n === 1, 'admin le todos os pedidos');
ok(await erra(null, `select 1 from public.reembolso_pedidos`, [], 'anon'), 'anon sem acesso');
const upd = await como(ana, `update public.reembolso_pedidos set status='estornado' where profile_id=$1`, [ana]).catch(() => null);
ok(upd === null || (upd.affectedRows ?? 0) === 0, 'cliente NAO atualiza pedido (status continua pendente)');
ok((await db.query(`select status from public.reembolso_pedidos where asaas_payment_id='pay_ana'`)).rows[0].status === 'pendente', 'status intacto apos tentativa de update');
const del = await como(ana, `delete from public.reembolso_pedidos where profile_id=$1`, [ana]).catch(() => null);
ok(del === null || (del.affectedRows ?? 0) === 0, 'cliente NAO apaga pedido');
const admUpd = await como(adm, `update public.reembolso_pedidos set status='aprovado'`).catch(() => null);
ok(admUpd === null || (admUpd.affectedRows ?? 0) === 0, 'admin NAO atualiza direto pela API (decisao so via function de servico)');
await db.query(`update public.reembolso_pedidos set status='recusado' where asaas_payment_id='pay_ana'`);
await ins(ana, 'pay_ana');
ok(true, 'apos recusa, novo pedido para a mesma cobranca e permitido');
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
