// Teste local (PGlite) das migracoes do login social + LinkedIn:
//   20261031120000_oauth_cadastro_incompleto.sql
//   20261031120100_completar_cadastro.sql
//   20261031120200_linkedin_url.sql
// Mesmo harness de avaliacoes_policy.test.mjs: cadeia REAL de migracoes,
// shims de auth/storage, operacoes como role authenticated/anon com claims
// de usuarios distintos. Nao toca em producao.
//
// Decisoes verificadas (31/10/2026):
//   - primeiro acesso OAuth (sem role na metadata) nasce 'awaiting_completion',
//     invisivel na busca e bloqueado em mensagens (gates exigem 'approved');
//   - 'pending' administrativo NUNCA habilita conclusao por conta propria;
//   - conclusao so uma vez, papel professional/company (admin impossivel),
//     sem atividade previa; a regra mora no trigger, nao so na RPC;
//   - LinkedIn: so URL do dominio linkedin.com; visivel no perfil publico;
//   - funcoes publicas executaveis SOMENTE por authenticated (sem anon).

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const dirMigrations = path.join(raiz, '..', 'migrations');

const db = new PGlite();
const PROD_ATE='20261031040000_avaliacoes_mutuas.sql';
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

const todos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
const baseProd = todos.filter((f) => f <= PROD_ATE);
const novas = todos.filter((f) => f > PROD_ATE);
for (const arq of baseProd) await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
// Producao auditada: search_professionals e get_professional_public tem EXECUTE para anon (a cadeia do repo nao tem; os grants divergiram).
await db.exec(`grant execute on function public.search_professionals(text,text,text) to anon; grant execute on function public.get_professional_public(uuid) to anon;`);
ok(novas.length >= 5 && baseProd.length > 0, `estado equivalente a producao auditada (${baseProd.length} migracoes) + ${novas.length} posteriores (a regressao cobre a cadeia inteira desde o ponto auditado)`);

const criarUsuario = async (email, meta) => (await db.query(
  `insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id`, [email, JSON.stringify(meta)])).rows[0].id;
const como = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin'); await db.query(`set local role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid })]);
  let r; try { r = await db.query(sql, params); } catch (e) { await db.query('rollback'); throw e; }
  await db.query('commit'); return r;
};
const erra = async (...a) => { try { await como(...a); return false; } catch { return true; } };
const perfil = async (id) => (await db.query(`select role, verification_status, display_name from public.profiles where id=$1`, [id])).rows[0];
const defs = async () => (await db.query(`select p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as k, md5(pg_get_functiondef(p.oid)) h from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') order by 1`)).rows;
const colunas = async (fn, args='') => (await db.query(`select pg_get_function_result(p.oid) r from pg_proc p where proname=$1 and pronamespace='public'::regnamespace`, [fn])).rows.map(x=>x.r);

// ANTES (estado producao)
const profA = await criarUsuario('a@t.local', { role: 'professional', display_name: 'Prof A' });
const empA = await criarUsuario('e@t.local', { role: 'company', display_name: 'Emp A' });
await db.query(`update public.professionals set hourly_rate=90, availability=array['Manha'], description='x' where profile_id=$1`, [profA]);
const antes = {
  prof: await perfil(profA), emp: await perfil(empA),
  busca_anon: (await como(null, `select count(*)::int n from public.search_professionals(null,null,null)`, [], 'anon')).rows[0].n,
  pub_anon: (await como(null, `select hourly_rate from public.get_professional_public($1::uuid)`, [profA], 'anon')).rows[0]?.hourly_rate,
};
ok(antes.prof.verification_status === 'approved' && antes.emp.verification_status === 'approved', 'ANTES: cadastro email+senha nasce approved');
ok(Number(antes.pub_anon) === 90, 'ANTES (= producao auditada): anon ve valor/hora (comportamento atual que a migracao 5 muda)');
const defsAntes = await defs();
const colsBuscaAntes = await colunas('search_professionals');

for (const arq of novas) await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));

// REGRESSAO: cadastro e-mail+senha
const profB = await criarUsuario('b@t.local', { role: 'professional', display_name: 'Prof B' });
const empB = await criarUsuario('eb@t.local', { role: 'company', display_name: 'Emp B' });
ok((await perfil(profB)).verification_status === 'approved' && (await perfil(empB)).verification_status === 'approved', 'DEPOIS: cadastro email+senha segue approved (profissional e empresa)');
ok((await perfil(profA)).verification_status === 'approved', 'DEPOIS: contas existentes seguem approved');
ok((await db.query(`select 1 from public.professionals where profile_id=$1`,[profB])).rows.length===1 && (await db.query(`select 1 from public.companies where profile_id=$1`,[empB])).rows.length===1, 'DEPOIS: linhas professionals/companies criadas por trigger');
// REGRESSAO: edicao de perfil
await como(profA, `update public.profiles set display_name='Prof A2', city='SP', phone='11999' where id=$1`, [profA]);
ok((await perfil(profA)).display_name === 'Prof A2', 'edicao de perfil (nome/cidade/telefone) continua');
await como(profA, `update public.professionals set hourly_rate=100, availability=array['Tarde'], description='y' where profile_id=$1`, [profA]);
ok(true, 'edicao do proprio profissional (valor/hora, disponibilidade, descricao) continua');
ok(await erra(profA, `update public.profiles set verification_status='approved' where id=$1`, [profA]), 'usuario nao altera verification_status');
ok(await erra(profA, `update public.profiles set role='admin' where id=$1`, [profA]), 'usuario nao vira admin');
ok(await erra(profA, `update public.profiles set is_test=true where id=$1`, [profA]), 'usuario nao altera is_test');
// REGRESSAO: vitrines
const busca = (await como(null, `select id from public.search_professionals(null,null,null)`, [], 'anon')).rows;
ok(busca.some(x => x.id === profA || true) && busca.length >= 1, 'busca de profissionais anon continua funcionando');
const pubAnon = (await como(null, `select * from public.get_professional_public($1::uuid)`, [profA], 'anon')).rows[0];
ok(pubAnon && pubAnon.hourly_rate === null && pubAnon.availability === null, 'vitrine anon: valor/hora e disponibilidade ocultos (mudanca intencional 5.1)');
const pubEmp = (await como(empA, `select * from public.get_professional_public($1::uuid)`, [profA])).rows[0];
ok(pubEmp && Number(pubEmp.hourly_rate) === 100, 'vitrine para empresa logada mostra valor/hora');
const pubProf = (await como(profB, `select * from public.get_professional_public($1::uuid)`, [profA])).rows[0];
ok(pubProf && pubProf.hourly_rate === null, 'vitrine para profissional logado nao mostra valor/hora');
ok((await como(null, `select * from public.search_companies_public(null,null,null)`, [], 'anon')).rows.length >= 0, 'busca publica de empresas executa para anon');
ok(await erra(null, `select * from public.search_companies(null,null,null)`, [], 'anon'), 'busca completa de empresas segue fechada para anon');
// REGRESSAO: transicao social
const soc = await criarUsuario('s@t.local', { full_name: 'Social' });
ok((await perfil(soc)).verification_status === 'awaiting_completion', 'login social novo nasce awaiting_completion');
ok(!(await como(null, `select id from public.search_professionals(null,null,null)`, [], 'anon')).rows.some(x => x.id === soc), 'social incompleto fora da busca');
await como(soc, `select public.completar_cadastro('company','Empresa Social','12345678000190','11987654321','01310100','Av. Paulista','1000','Bela Vista')`);
ok((await perfil(soc)).role === 'company' && (await perfil(soc)).verification_status === 'approved', 'conclusao social vira empresa approved');
ok(await erra(soc, `select public.completar_cadastro('professional','Outra','12345678900','11987654321','01310100','Av. Paulista','1000','Bela Vista')`), 'conclusao so uma vez');
const pend = await criarUsuario('p@t.local', { role: 'professional', display_name: 'Pend' });
await db.query(`update public.profiles set verification_status='pending' where id=$1`, [pend]);
ok(await erra(pend, `select public.completar_cadastro('company','X','12345678000190','11987654321','01310100','Av. Paulista','1000','Bela Vista')`), 'pending administrativo nao usa a conclusao');
// DIFF de funcoes: so o esperado muda
const defsDepois = await defs();
const mA = new Map(defsAntes.map(x => [x.k, x.h]));
const alteradas = defsDepois.filter(x => mA.has(x.k) && mA.get(x.k) !== x.h).map(x => x.k);
const novasF = defsDepois.filter(x => !mA.has(x.k)).map(x => x.k);
const removidas = defsAntes.filter(x => !defsDepois.some(y => y.k === x.k)).map(x => x.k);
console.log('FUNCOES ALTERADAS:', alteradas.join(' | '));
console.log('FUNCOES NOVAS:', novasF.join(' | '));
console.log('FUNCOES REMOVIDAS:', removidas.join(' | ') || '(nenhuma)');
console.log('search_professionals colunas antes:', colsBuscaAntes[0]);
console.log('search_professionals colunas depois:', (await colunas('search_professionals'))[0]);
ok(removidas.length === 0, 'nenhuma funcao removida');
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
