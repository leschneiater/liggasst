// Teste local (PGlite) da migracao de votos do Radar (20261105030000_radar_votos.sql).
//
// Contrato verificado:
//   - um voto por pessoa por artigo (PK), trocavel via upsert e removivel;
//   - so assinante pago (regra unica, cortesia incluida) vota;
//   - voto so em artigo publicado e ja no ar (rascunho/agendado: barrado);
//   - cada um le apenas o proprio voto; admin le todos (resumo);
//   - ninguem vota/edita/apaga voto de outra pessoa; anon nada faz.
//
// Como rodar:  node supabase/tests/radar_votos_policy.test.mjs

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
ok(arquivos.includes('20261105030000_radar_votos.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo radar_votos)`);

const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const gratis = await criarUsuario('gratis@teste.local', { role: 'professional', display_name: 'Gratis' });
const pro = await criarUsuario('pro@teste.local', { role: 'company', display_name: 'Pro' });
const pro2 = await criarUsuario('pro2@teste.local', { role: 'professional', display_name: 'Pro2' });
const cortesiado = await criarUsuario('cort@teste.local', { role: 'professional', display_name: 'Cort' });
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
for (const uid of [pro, pro2]) {
  await db.query(
    `update public.subscriptions set plan = 'pro_company', status = 'active', environment = 'production' where profile_id = $1`, [uid]);
}
await db.query(
  `insert into public.cortesias (profile_id, motivo, concedida_por) values ($1, 'parceria', $2)`, [cortesiado, admin]);

await db.query(
  `insert into public.radar_posts (titulo, resumo, conteudo, status) values
   ('Publicado Um', 'resumo', 'corpo', 'publicado'),
   ('Rascunho Um', 'resumo', 'corpo', 'rascunho')`);
const pubId = (await db.query(`select id from public.radar_posts where titulo = 'Publicado Um'`)).rows[0].id;
const rascId = (await db.query(`select id from public.radar_posts where titulo = 'Rascunho Um'`)).rows[0].id;

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

// ---------- votar ----------
await como(pro, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [pubId, pro]);
let r = await db.query(`select voto from public.radar_votos where post_id = $1 and profile_id = $2`, [pubId, pro]);
ok(r.rows.length === 1 && r.rows[0].voto === 'joia', 'assinante pago vota joia');

// troca de voto (upsert): continua uma linha so
await como(pro, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'nao_joia')
                 on conflict (post_id, profile_id) do update set voto = excluded.voto, updated_at = now()`, [pubId, pro]);
r = await db.query(`select voto from public.radar_votos where post_id = $1 and profile_id = $2`, [pubId, pro]);
ok(r.rows.length === 1 && r.rows[0].voto === 'nao_joia', 'voto trocavel, segue um por pessoa');

// cortesiado vota (regra unica)
await como(cortesiado, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [pubId, cortesiado]);
r = await db.query(`select count(*)::int n from public.radar_votos where post_id = $1 and profile_id = $2`, [pubId, cortesiado]);
ok(r.rows[0].n === 1, 'CORTESIADO vota (cortesia = acesso pago)');

// gratuita nao vota
ok(await erra(gratis, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [pubId, gratis]),
  'gratuita NAO vota');

// rascunho nao recebe voto
ok(await erra(pro2, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [rascId, pro2]),
  'voto em RASCUNHO barrado');

// voto em nome de outra pessoa barrado
ok(await erra(pro2, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'joia')`, [pubId, pro]),
  'ninguem insere voto com profile_id alheio');

// anon nao vota
ok(await erra(null, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, gen_random_uuid(), 'joia')`, [pubId], 'anon'),
  'anon NAO vota');

// ---------- leitura ----------
r = await como(pro, `select voto from public.radar_votos where post_id = $1`, [pubId]);
ok(r.rows.length === 1 && r.rows[0].voto === 'nao_joia', 'assinante le apenas o PROPRIO voto');

r = await como(pro2, `select count(*)::int n from public.radar_votos where post_id = $1`, [pubId]);
ok(r.rows[0].n === 0, 'assinante sem voto nao ve votos alheios (contagem invisivel)');

r = await como(admin, `select count(*)::int n from public.radar_votos where post_id = $1`, [pubId]);
ok(r.rows[0].n === 2, 'admin le TODOS os votos (resumo de relevancia)');

// ---------- remover/editar ----------
r = await como(pro2, `delete from public.radar_votos where post_id = $1 and profile_id = $2`, [pubId, pro]);
ok(r.affectedRows === 0, 'ninguem apaga voto alheio (RLS: 0 linhas)');
r = await como(pro2, `update public.radar_votos set voto = 'joia' where post_id = $1 and profile_id = $2`, [pubId, pro]);
ok(r.affectedRows === 0, 'ninguem edita voto alheio (RLS: 0 linhas)');

r = await como(pro, `delete from public.radar_votos where post_id = $1 and profile_id = $2`, [pubId, pro]);
ok(r.affectedRows === 1, 'votante retira o proprio voto (toggle off)');

// valor invalido barrado pelo check
ok(await erra(pro2, `insert into public.radar_votos (post_id, profile_id, voto) values ($1, $2, 'talvez')`, [pubId, pro2]),
  "voto fora de 'joia'/'nao_joia' barrado");

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
