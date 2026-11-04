// Teste local (PGlite) da migracao da capa do Radar (20261108050000_radar_capa.sql).
//
// Contrato verificado:
//   - radar_posts tem capa_path; admin grava a capa via update (grant + RLS);
//   - usuario comum NAO grava capa_path (grant de update segue admin-only
//     via policy radar_posts_admin_update);
//   - leitura de assinantes usa a REGRA UNICA (private.plano_da_conta):
//     cortesiado LE artigos publicados (antes a RLS inline barrava);
//   - gratuita e anon NAO leem; rascunho nao vaza;
//   - bucket radar-covers: publico p/ leitura, escrita so admin, 2 MB.
//
// Como rodar:  node supabase/tests/radar_capa_policy.test.mjs

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
  -- grants padrao do Supabase real (o PGlite nao os cria sozinho):
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant select on storage.objects to anon;
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
ok(arquivos.includes('20261108050000_radar_capa.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo radar_capa)`);

const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const gratis = await criarUsuario('gratis@teste.local', { role: 'professional', display_name: 'Gratis' });
const pro = await criarUsuario('pro@teste.local', { role: 'company', display_name: 'Pro' });
const cortesiado = await criarUsuario('cort@teste.local', { role: 'professional', display_name: 'Cort' });
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(
  `update public.subscriptions set plan = 'pro_company', status = 'active', environment = 'production' where profile_id = $1`, [pro]);
await db.query(
  `insert into public.cortesias (profile_id, motivo, concedida_por) values ($1, 'parceria', $2)`, [cortesiado, admin]);

await db.query(
  `insert into public.radar_posts (titulo, resumo, conteudo, status) values
   ('Publicado Um', 'resumo', 'corpo', 'publicado'),
   ('Rascunho Um', 'resumo', 'corpo', 'rascunho')`);
const pubId = (await db.query(`select id from public.radar_posts where titulo = 'Publicado Um'`)).rows[0].id;

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

// ---------- leitura pela regra unica ----------
let r = await como(pro, `select titulo from public.radar_posts`);
ok(r.rows.length === 1 && r.rows[0].titulo === 'Publicado Um', 'assinante pago le publicado (rascunho nao vaza)');

r = await como(cortesiado, `select titulo from public.radar_posts`);
ok(r.rows.length === 1, 'CORTESIADO le artigos publicados (regra unica na RLS)');

r = await como(gratis, `select titulo from public.radar_posts`);
ok(r.rows.length === 0, 'gratuita NAO le artigos');
ok(await erra(null, `select titulo from public.radar_posts`, [], 'anon'), 'anon NAO le artigos');

// ---------- capa_path: escrita so admin ----------
await como(admin, `update public.radar_posts set capa_path = 'capa1.png' where id = $1`, [pubId]);
r = await db.query(`select capa_path from public.radar_posts where id = $1`, [pubId]);
ok(r.rows[0].capa_path === 'capa1.png', 'admin grava capa_path');

r = await como(pro, `update public.radar_posts set capa_path = 'x.png' where id = $1`, [pubId]);
ok(r.affectedRows === 0, 'usuario comum NAO grava capa (RLS: 0 linhas)');

r = await como(pro, `select capa_path from public.radar_posts where id = $1`, [pubId]);
ok(r.rows[0].capa_path === 'capa1.png', 'assinante le a capa do artigo');

// ---------- bucket ----------
r = await db.query(`select public, file_size_limit from storage.buckets where id = 'radar-covers'`);
ok(r.rows.length === 1 && r.rows[0].public === true && Number(r.rows[0].file_size_limit) === 2097152,
  'bucket radar-covers publico, 2 MB');
ok(await erra(pro, `insert into storage.objects (bucket_id, name) values ('radar-covers', 'x.png')`),
  'usuario comum NAO sobe capa no bucket');
r = await como(null, `select name from storage.objects where bucket_id = 'radar-covers'`, [], 'anon');
ok(r.rows.length === 0, 'leitura publica do bucket funciona para anon (0 objetos)');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
