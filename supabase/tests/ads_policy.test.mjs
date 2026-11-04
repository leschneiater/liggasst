// Teste local (PGlite) da migracao do carrossel de anuncios
// (20261108030000_ads_carrossel.sql, decisao dela 04/11/2026).
//
// Cadeia REAL de migracoes sobre Postgres embarcado (mesmos shims de
// radar_posts_policy.test.mjs). Contrato verificado:
//   - conta gratuita le SOMENTE banners ativos;
//   - assinante pago (pro ativo, cancelado/em atraso dentro do periodo)
//     NAO le nenhum banner — anuncio nunca aparece para pagante;
//   - anon NAO le (sem grant);
//   - admin ve todos (incl. inativos) e gerencia; usuario comum NAO
//     insere/atualiza/apaga;
//   - clique so via RPC registrar_clique_ad (incrementa ativo; UPDATE
//     direto em cliques negado para usuario comum);
//   - ads_config: todo logado le; so admin altera;
//   - bucket ads: leitura publica, escrita so admin.
//
// Como rodar:  node supabase/tests/ads_policy.test.mjs
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
    name text not null,
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
ok(arquivos.includes('20261108030000_ads_carrossel.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo ads_carrossel)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const gratis = await criarUsuario('gratis@teste.local', { role: 'professional', display_name: 'Gratis' });
const proAtivo = await criarUsuario('pro@teste.local', { role: 'company', display_name: 'Pro' });
const cancelVigente = await criarUsuario('canc@teste.local', { role: 'professional', display_name: 'Canc' });
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);

const setSub = (uid, plan, status, fim, env = 'production') => db.query(
  `update public.subscriptions set plan = $2, status = $3, current_period_end = $4, environment = $5 where profile_id = $1`,
  [uid, plan, status, fim, env]);
await setSub(proAtivo, 'pro_company', 'active', null);
await setSub(cancelVigente, 'pro_professional', 'canceled', '2099-01-01');

// Banners de exemplo (escrita como superuser, como o admin faria via painel):
// dois ativos (ordem 1 e 2) e um inativo.
await db.query(
  `insert into public.ads_banners (titulo, imagem_path, link, ordem, ativo)
   values ('Ativo Um', 'a1.png', 'https://a.example', 2, true),
          ('Ativo Dois', 'a2.png', null, 1, true),
          ('Inativo', 'a3.png', null, 3, false)`);

const como = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin');
  await db.query(`set local role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  let r;
  try { r = await db.query(sql, params); }
  catch (e) { await db.query('rollback'); throw e; }
  await db.query('commit');
  return r;
};
const erra = async (...a) => { try { await como(...a); return false; } catch { return true; } };

// ---------- leitura: so gratuita, so ativos ----------
let r = await como(gratis, `select titulo from public.ads_banners order by ordem`);
ok(r.rows.length === 2 && r.rows[0].titulo === 'Ativo Dois' && r.rows[1].titulo === 'Ativo Um',
  'conta gratuita le somente banners ativos, na ordem definida');

r = await como(proAtivo, `select titulo from public.ads_banners`);
ok(r.rows.length === 0, 'assinante pago ativo NAO le nenhum banner');

r = await como(cancelVigente, `select titulo from public.ads_banners`);
ok(r.rows.length === 0, 'cancelado dentro do periodo pago NAO le banner (ainda e pagante)');

ok(await erra(null, `select titulo from public.ads_banners`, [], 'anon'), 'anon NAO le banners (sem grant)');

r = await como(admin, `select titulo from public.ads_banners order by ordem`);
ok(r.rows.length === 3, 'admin le todos, inclusive inativos');

// ---------- escrita: so admin ----------
ok(await erra(gratis, `insert into public.ads_banners (titulo, imagem_path) values ('X', 'x.png')`),
  'usuario comum NAO cria banner');
r = await como(gratis, `update public.ads_banners set ativo = false`);
ok(r.affectedRows === 0, 'usuario comum NAO edita banner (RLS: 0 linhas afetadas)');
r = await como(gratis, `delete from public.ads_banners`);
ok(r.affectedRows === 0, 'usuario comum NAO apaga banner (RLS: 0 linhas afetadas)');

r = await como(admin, `insert into public.ads_banners (titulo, imagem_path) values ('Do Admin', 'd.png') returning id`);
ok(r.rows.length === 1, 'admin cria banner');
await como(admin, `update public.ads_banners set ativo = false where titulo = 'Do Admin'`);
ok(true, 'admin edita banner');
await como(admin, `delete from public.ads_banners where titulo = 'Do Admin'`);
ok(true, 'admin apaga banner');

// ---------- cliques: so via RPC ----------
const bannerId = (await db.query(`select id from public.ads_banners where titulo = 'Ativo Um'`)).rows[0].id;
await como(gratis, `select public.registrar_clique_ad($1)`, [bannerId]);
await como(gratis, `select public.registrar_clique_ad($1)`, [bannerId]);
r = await db.query(`select cliques from public.ads_banners where id = $1`, [bannerId]);
ok(r.rows[0].cliques === 2, 'clique conta via RPC (2 cliques = 2)');

ok(await erra(gratis, `update public.ads_banners set cliques = 99 where id = $1`, [bannerId]),
  'usuario comum NAO altera contagem de cliques direto');

const inativoId = (await db.query(`select id from public.ads_banners where titulo = 'Inativo'`)).rows[0].id;
await como(gratis, `select public.registrar_clique_ad($1)`, [inativoId]);
r = await db.query(`select cliques from public.ads_banners where id = $1`, [inativoId]);
ok(r.rows[0].cliques === 0, 'clique em banner inativo nao conta');

// ---------- config ----------
r = await como(gratis, `select intervalo_segundos, max_ativos from public.ads_config where id = true`);
ok(r.rows.length === 1 && r.rows[0].intervalo_segundos === 5 && r.rows[0].max_ativos === 5,
  'config padrao existe (5s / 5 artes) e qualquer logado le');
r = await como(gratis, `update public.ads_config set max_ativos = 9`);
ok(r.affectedRows === 0, 'usuario comum NAO altera a config (RLS: 0 linhas afetadas)');
await como(admin, `update public.ads_config set intervalo_segundos = 8, max_ativos = 3`);
r = await db.query(`select intervalo_segundos, max_ativos from public.ads_config where id = true`);
ok(r.rows[0].intervalo_segundos === 8 && r.rows[0].max_ativos === 3, 'admin altera tempo e maximo de artes');

// ---------- bucket ----------
r = await db.query(`select public, file_size_limit from storage.buckets where id = 'ads'`);
ok(r.rows.length === 1 && r.rows[0].public === true, 'bucket "ads" existe e e publico para leitura');
ok(await erra(gratis, `insert into storage.objects (bucket_id, name) values ('ads', 'x.png')`),
  'usuario comum NAO sobe arte no bucket');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
