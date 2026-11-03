// Teste local (PGlite) da paridade de gate em contratos
// (migracao 20261103020000_contratos_paridade_teste.sql).
// Como rodar:  node supabase/tests/contratos_paridade_teste.test.mjs
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


ok(arquivos.includes('20261103020000_contratos_paridade_teste.sql'), `cadeia real aplicada (${arquivos.length} migracoes)`);
const cu = async (email, meta) => (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id`,[email,JSON.stringify(meta)])).rows[0].id;
const empT = await cu('et@x.local',{role:'company',display_name:'EmpTeste'});
const empR = await cu('er@x.local',{role:'company',display_name:'EmpReal'});
const proT = await cu('pt@x.local',{role:'professional',display_name:'ProfTeste'});
const proR = await cu('pr@x.local',{role:'professional',display_name:'ProfReal'});
const adm = await cu('a@x.local',{role:'admin',display_name:'Adm'});
await db.query(`update public.profiles set is_test=true where id in ($1,$2)`,[empT,proT]);
await db.query(`update public.profiles set verification_status='approved' where id in ($1,$2,$3,$4)`,[empT,empR,proT,proR]);
const cm = async (uid, sql, params=[]) => { await db.query('begin'); await db.query('set local role authenticated'); await db.query(`select set_config('request.jwt.claims',$1,true)`,[JSON.stringify({sub:uid})]); let r; try { r = await db.query(sql,params);} catch(e){ await db.query('rollback'); throw e;} await db.query('commit'); return r; };
const tenta = async (uid, sql, p=[]) => { try { return {r: await cm(uid,sql,p)}; } catch(e){ return {e: e.message}; } };
const prop = (e,p,t) => tenta(e, `insert into public.contracts (company_id, professional_id, title) values ($1,$2,$3) returning id`, [e,p,t]);
ok((await prop(empT, proR, 'TR')).e !== undefined, 'LOCAL empresa teste -> profissional REAL: bloqueado');
ok((await prop(empR, proT, 'RT')).e !== undefined, 'LOCAL empresa real -> profissional teste: bloqueado');
const tt = await prop(empT, proT, 'TT'); ok(tt.r && tt.r.rows.length===1, 'LOCAL teste -> teste: permitido');
const rr = await prop(empR, proR, 'RR'); ok(rr.r && rr.r.rows.length===1, 'LOCAL real -> real: permitido');
ok((await db.query(`select count(*) c from public.contracts`)).rows[0].c==2, 'LOCAL so as 2 propostas pareadas existem');
ok((await cm(proR, `select count(*) n from public.listar_contratos()`)).rows[0].n==1, 'LOCAL profissional real ve apenas a proposta real->real');
ok((await cm(proT, `select count(*) n from public.listar_contratos()`)).rows[0].n==1, 'LOCAL profissional teste ve apenas a proposta teste->teste');
// contornos: sem grant de update/delete; troca de is_test so admin
ok((await tenta(empT, `update public.contracts set professional_id=$1 where title='TT'`, [proR])).e !== undefined, 'LOCAL empresa nao troca a parte do contrato (sem update)');
ok((await tenta(empT, `delete from public.contracts where title='TT'`)).e !== undefined, 'LOCAL empresa nao apaga contrato (sem delete)');
ok((await tenta(empT, `update public.profiles set is_test=false where id=$1`, [empT])).e !== undefined, 'LOCAL empresa nao muda o proprio is_test para furar a paridade');
ok((await tenta(proR, `update public.profiles set is_test=true where id=$1`, [proR])).e !== undefined, 'LOCAL profissional nao muda o proprio is_test');
console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail?1:0);
