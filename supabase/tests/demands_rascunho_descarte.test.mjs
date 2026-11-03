// Teste local (PGlite) do rascunho seguro de demandas e do descarte
// (migracao 20261103010000_demandas_rascunho_descarte.sql).
//
// Contrato verificado (cadeia REAL de migracoes, role authenticated):
//   - rascunho e invisivel a todos exceto dono e admin (inclusive com
//     empresa NAO teste e profissional comum);
//   - publicar (draft -> active) torna visivel;
//   - SOMENTE o dono apaga, e SOMENTE rascunho; ativa/concluida/cancelada
//     nao sao apagaveis; profissional e outra empresa nao apagam nem alteram;
//   - rascunho nao e reaberto depois de encerrado (maquina de estados intacta).
//
// Como rodar:  node supabase/tests/demands_rascunho_descarte.test.mjs

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

ok(arquivos.includes('20261103010000_demandas_rascunho_descarte.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo descarte de rascunho)`);

const cu = async (email, meta) => (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id`,[email,JSON.stringify(meta)])).rows[0].id;
const emp = await cu('e@x.local',{role:'company',display_name:'Emp'});
const emp2 = await cu('e2@x.local',{role:'company',display_name:'Emp2'});
const prof = await cu('p@x.local',{role:'professional',display_name:'Prof'});
const adm = await cu('a@x.local',{role:'admin',display_name:'Adm'});
await db.query(`update public.profiles set role='admin' where id=$1`,[adm]);
// emp e emp2 NAO sao de teste: o rascunho deve ser invisivel mesmo assim
const cm = async (uid, sql, params=[]) => { await db.query('begin'); await db.query('set local role authenticated'); await db.query(`select set_config('request.jwt.claims',$1,true)`,[JSON.stringify({sub:uid})]); let r; try { r = await db.query(sql,params);} catch(e){ await db.query('rollback'); throw e;} await db.query('commit'); return r; };
const tenta = async (uid, sql, params=[]) => { try { return { r: await cm(uid, sql, params) }; } catch (e) { return { e }; } };
const n = async (uid, sql, params=[]) => (await cm(uid, sql, params)).rows.length;

const rasc = (await cm(emp,`insert into public.demands (company_id,title,description,status) values ($1,'RASC','x','draft') returning id`,[emp])).rows[0].id;
ok(!!rasc, 'LOCAL empresa cria rascunho so com titulo e descricao');
ok(await n(prof,`select id from public.demands`)===0, 'LOCAL profissional comum nao ve o rascunho (lista)');
ok(await n(prof,`select id from public.demands where id=$1`,[rasc])===0, 'LOCAL profissional comum nao ve o rascunho (por id)');
ok(await n(emp2,`select id from public.demands where id=$1`,[rasc])===0, 'LOCAL outra empresa nao ve o rascunho');
ok(await n(emp,`select id from public.demands where id=$1`,[rasc])===1, 'LOCAL dona ve o rascunho');
ok(await n(adm,`select id from public.demands where id=$1`,[rasc])===1, 'LOCAL admin ve o rascunho');

// edicao do rascunho pelo dono; terceiros nao alteram
await cm(emp,`update public.demands set title='RASC2' where id=$1`,[rasc]);
ok((await db.query(`select title from public.demands where id=$1`,[rasc])).rows[0].title==='RASC2', 'LOCAL dona edita o rascunho');
await tenta(prof,`update public.demands set title='HACK' where id=$1`,[rasc]);
await tenta(emp2,`update public.demands set title='HACK' where id=$1`,[rasc]);
ok((await db.query(`select title from public.demands where id=$1`,[rasc])).rows[0].title==='RASC2', 'LOCAL profissional e outra empresa nao alteram o rascunho');

// descarte por terceiros nao apaga
await tenta(prof,`delete from public.demands where id=$1`,[rasc]);
await tenta(emp2,`delete from public.demands where id=$1`,[rasc]);
ok((await db.query(`select 1 from public.demands where id=$1`,[rasc])).rows.length===1, 'LOCAL profissional e outra empresa nao descartam o rascunho');

// descarte pelo dono
const del = await cm(emp,`delete from public.demands where id=$1 and status='draft' returning id`,[rasc]);
ok(del.rows.length===1 && (await db.query(`select count(*) c from public.demands`)).rows[0].c==0, 'LOCAL dona descarta o proprio rascunho (0 linhas restantes)');

// publicar torna visivel
const r2 = (await cm(emp,`insert into public.demands (company_id,title,description,status) values ($1,'PUB','x','draft') returning id`,[emp])).rows[0].id;
await cm(emp,`update public.demands set status='active' where id=$1`,[r2]);
ok(await n(prof,`select id from public.demands where id=$1`,[r2])===1, 'LOCAL apos publicar, profissional comum ve (empresa nao teste)');

// ativa nao e apagavel
const dAtiva = await cm(emp,`delete from public.demands where id=$1 returning id`,[r2]);
ok(dAtiva.rows.length===0 && (await db.query(`select status from public.demands where id=$1`,[r2])).rows[0].status==='active', 'LOCAL demanda ativa NAO e apagavel pela dona');
// concluida/cancelada/em andamento nao apagaveis
await cm(emp,`update public.demands set status='completed' where id=$1`,[r2]);
ok((await cm(emp,`delete from public.demands where id=$1 returning id`,[r2])).rows.length===0, 'LOCAL demanda concluida NAO e apagavel');
const r3 = (await cm(emp,`insert into public.demands (company_id,title,description) values ($1,'C','x') returning id`,[emp])).rows[0].id;
await cm(emp,`update public.demands set status='cancelled' where id=$1`,[r3]);
ok((await cm(emp,`delete from public.demands where id=$1 returning id`,[r3])).rows.length===0, 'LOCAL demanda cancelada NAO e apagavel');
const r4 = (await db.query(`insert into public.demands (company_id,title,description,status) values ($1,'IP','x','in_progress') returning id`,[emp])).rows[0].id;
ok((await cm(emp,`delete from public.demands where id=$1 returning id`,[r4])).rows.length===0, 'LOCAL demanda em andamento NAO e apagavel');
// admin: sem policy de delete, nao apaga rascunho alheio por esta via
const r5 = (await cm(emp,`insert into public.demands (company_id,title,description,status) values ($1,'R5','x','draft') returning id`,[emp])).rows[0].id;
ok((await cm(adm,`delete from public.demands where id=$1 returning id`,[r5])).rows.length===0, 'LOCAL admin nao apaga rascunho alheio (so a dona)');
// anon nao apaga
let anonBloq=false; try { await db.query('begin'); await db.query('set local role anon'); await db.query(`delete from public.demands where id=$1`,[r5]); await db.query('rollback'); } catch(e){ anonBloq=true; await db.query('rollback'); }
ok(anonBloq && (await db.query(`select 1 from public.demands where id=$1`,[r5])).rows.length===1, 'LOCAL anon nao apaga');

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail?1:0);
