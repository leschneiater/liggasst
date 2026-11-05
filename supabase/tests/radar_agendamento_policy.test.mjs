// Teste local (PGlite) do AGENDAMENTO de artigos do Radar (sem migracao nova:
// a cadeia atual ja implementa publish-on-read). Contrato verificado:
//   - artigo com status 'publicado' e publicado_em NO FUTURO (agendado)
//     NAO aparece para assinante pago; admin enxerga normalmente;
//   - quando a hora passa (publicado_em <= now()), o mesmo artigo aparece
//     sozinho — sem cron nem job;
//   - artigo agendado NAO recebe voto enquanto nao entra no ar;
//   - cancelar (voltar para rascunho) esconde de novo;
//   - admin agenda/editar agendamento via update (grant + RLS admin).
//
// Como rodar:  node supabase/tests/radar_agendamento_policy.test.mjs

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

const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const pro = await criarUsuario('pro@teste.local', { role: 'company', display_name: 'Pro' });
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(
  `update public.subscriptions set plan = 'pro_company', status = 'active', environment = 'production' where profile_id = $1`, [pro]);

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

// Admin agenda um artigo: status publicado + publicado_em daqui a 2 dias.
const { rows: [post] } = await db.query(
  `insert into public.radar_posts (titulo, resumo, conteudo, status) values ('Agendado Um', 'resumo', 'corpo', 'rascunho') returning id`);
await como(admin, `update public.radar_posts set status = 'publicado', publicado_em = now() + interval '2 days' where id = $1`, [post.id]);
let r = await db.query(`select status, publicado_em > now() as futuro from public.radar_posts where id = $1`, [post.id]);
ok(r.rows[0].status === 'publicado' && r.rows[0].futuro === true, 'admin grava agendamento (status publicado, data futura)');

// Assinante NAO ve enquanto a hora nao chega
r = await como(pro, `select titulo from public.radar_posts where id = $1`, [post.id]);
ok(r.rows.length === 0, 'assinante NAO ve artigo agendado (publish-on-read)');

// Admin ve normalmente
r = await como(admin, `select titulo from public.radar_posts where id = $1`, [post.id]);
ok(r.rows.length === 1, 'admin ve o artigo agendado na lista');

// Agendado nao recebe voto enquanto nao entra no ar
ok(await erra(pro, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [post.id, pro]),
  'artigo agendado NAO recebe voto antes de entrar no ar');

// Hora chegou: aparece sozinho (sem cron) e passa a aceitar voto
await como(admin, `update public.radar_posts set publicado_em = now() - interval '1 minute' where id = $1`, [post.id]);
r = await como(pro, `select titulo from public.radar_posts where id = $1`, [post.id]);
ok(r.rows.length === 1, 'quando a hora passa, o artigo aparece SOZINHO para o assinante');
await como(pro, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [post.id, pro]);
r = await db.query(`select count(*)::int n from public.radar_votos where post_id = $1`, [post.id]);
ok(r.rows[0].n === 1, 'depois de entrar no ar, aceita voto normalmente');

// Editar o agendamento: admin muda a data (volta para o futuro)
await como(admin, `update public.radar_posts set publicado_em = now() + interval '5 days' where id = $1`, [post.id]);
r = await como(pro, `select titulo from public.radar_posts where id = $1`, [post.id]);
ok(r.rows.length === 0, 'reagendar para o futuro esconde de novo do assinante');

// Cancelar: volta para rascunho
await como(admin, `update public.radar_posts set status = 'rascunho' where id = $1`, [post.id]);
r = await db.query(`select status from public.radar_posts where id = $1`, [post.id]);
ok(r.rows[0].status === 'rascunho', 'cancelar agendamento devolve o artigo para rascunho');

// Usuario comum NAO agenda (update em radar_posts e admin-only: 0 linhas)
r = await como(pro, `update public.radar_posts set status = 'publicado', publicado_em = now() + interval '1 day' where id = $1`, [post.id]);
ok(r.affectedRows === 0, 'usuario comum NAO consegue agendar/publicar (RLS: 0 linhas)');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
