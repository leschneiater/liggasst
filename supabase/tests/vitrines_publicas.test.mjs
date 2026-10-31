// Teste local (PGlite) das vitrines publicas e do escopo de grants.
//
// Roda a cadeia REAL de migracoes do repositorio (supabase/migrations/*.sql,
// incluindo 20261031130000_vitrines_publicas.sql) sobre um Postgres
// embarcado, com shims minimos de auth/storage. Depois exercita o estado
// final como anon (nao logado) e como authenticated, a mesma leitura que
// o PostgREST faz.
//
// Contrato verificado (decisao de produto de 31/10):
//   - anon executa search_companies_public e recebe so empresas aprovadas,
//     sem is_test, com shape resumido (sem needs, sem contato, sem demandas);
//   - anon executa search_professionals/get_professional_public (vitrine)
//     e o payload NAO tem linkedin_url;
//   - anon NAO executa funcoes de area logada (search_companies, admin,
//     contratos, mensagens, avaliacoes de escrita/leitura autenticada);
//   - anon NAO le a tabela ratings diretamente;
//   - authenticated continua executando search_companies (area logada).
//
// Como rodar:  npm run test:vitrines
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

// pgcrypto nao existe no PGlite; gen_random_uuid e nativo do PG13+.
const aplicar = async (sql) => {
  const limpo = sql.replace(/create extension if not exists pgcrypto;/i, '');
  await db.exec(limpo);
};

// ---------- cadeia real de migracoes ----------
const arquivos = readdirSync(dirMigrations)
  .filter((f) => f.endsWith('.sql'))
  .sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(arquivos.includes('20261031130000_vitrines_publicas.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo vitrines)`);

// ---------- fixtures ----------
const ids = {};
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
ids.empresaSP = await criarUsuario('sp@teste.local', { role: 'company', display_name: 'Empresa SP Teste' });
ids.empresaPend = await criarUsuario('pend@teste.local', { role: 'company', display_name: 'Empresa Pendente' });
ids.empresaTeste = await criarUsuario('istest@teste.local', { role: 'company', display_name: 'Empresa IsTest' });
ids.admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin Com Empresa' });
ids.prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Aprovado' });
ids.viewer = await criarUsuario('viewer@teste.local', { role: 'professional', display_name: 'Prof Viewer' });

await db.query(`update public.companies set segment = 'Indústria Metalúrgica', employee_count = '101-500',
  description = 'desc', needs = array['PCMSO'] where profile_id = $1`, [ids.empresaSP]);
await db.query(`update public.profiles set city = 'São Paulo', state = 'SP' where id = $1`, [ids.empresaSP]);
await db.query(`update public.profiles set verification_status = 'pending' where id = $1`, [ids.empresaPend]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.empresaTeste]);
await db.query(`insert into public.companies (profile_id, segment) values ($1, 'Educação')`, [ids.admin]);
await db.query(`update public.profiles set city = 'Campinas', state = 'SP' where id = $1`, [ids.prof]);
await db.query(`update public.professionals set specialization = 'NR-35', description = 'prof desc', hourly_rate = 90, availability = array['Manhãs'] where profile_id = $1`, [ids.prof]);

// executa como visitante anonimo (sem claims, role anon)
const comoAnon = async (sql, params = []) => {
  await db.query('begin');
  await db.query('set local role anon');
  await db.query(`select set_config('request.jwt.claims', '', true)`);
  try {
    const r = await db.query(sql, params);
    await db.query('rollback');
    return { rows: r.rows };
  } catch (e) {
    await db.query('rollback');
    return { erro: e.message };
  }
};
// executa como um usuario autenticado especifico (mesma leitura do PostgREST)
const comoUsuario = async (uid, sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  const r = await db.query(sql, params);
  await db.query('rollback');
  return r.rows;
};
const nomes = (rows) => rows.map((r) => r.display_name).sort();
const negado = (res) => res.erro !== undefined && /permission denied/i.test(res.erro);

// ---------- vitrine de empresas (anon) ----------
let res = await comoAnon('select * from public.search_companies_public(null, null, null)');
ok(res.erro === undefined, 'anon executa search_companies_public');
if (res.rows) {
  ok(nomes(res.rows).includes('Empresa SP Teste'), 'vitrine mostra empresa aprovada');
  ok(!nomes(res.rows).includes('Empresa Pendente'), 'vitrine NAO mostra pendente');
  ok(!nomes(res.rows).includes('Empresa IsTest'), 'vitrine NAO mostra is_test (anon fora do gate)');
  ok(!nomes(res.rows).includes('Admin Com Empresa'), 'vitrine NAO mostra conta admin com linha em companies');
  const campos = Object.keys(res.rows[0]).sort();
  const esperado = ['city', 'description', 'display_name', 'employee_count', 'id', 'segment', 'state'];
  ok(JSON.stringify(campos) === JSON.stringify(esperado),
    'shape da vitrine: sem needs, sem contato, sem avatar/verification_status');
}
res = await comoAnon('select * from public.search_companies_public($1, null, null)', ['sp']);
ok(res.erro === undefined && res.rows.length === 1, 'vitrine filtra por estado (upper no SQL)');
res = await comoAnon('select * from public.search_companies_public(null, null, $1)', ['metal']);
ok(res.erro === undefined && res.rows.length === 1, 'vitrine filtra por segmento (ilike)');

// ---------- vitrine de profissionais (anon) ----------
res = await comoAnon('select * from public.search_professionals(null, null, null)');
ok(res.erro === undefined, 'anon executa search_professionals (vitrine)');
if (res.rows && res.rows.length > 0) {
  ok(nomes(res.rows).includes('Prof Aprovado'), 'vitrine mostra profissional aprovado');
  ok(res.rows[0].linkedin_url === null, 'payload da vitrine tem linkedin_url NULL para anon (so empresas logadas veem)');
  ok(res.rows[0].hourly_rate === null && res.rows[0].availability === null,
    'vitrine NAO expoe valor/hora nem disponibilidade para anon (so empresas logadas veem)');
}
res = await comoAnon('select * from public.get_professional_public($1)', [ids.prof]);
ok(res.erro === undefined && res.rows.length === 1 && res.rows[0].linkedin_url === null,
  'anon abre perfil publico com linkedin_url NULL');
ok(res.rows[0].hourly_rate === null && res.rows[0].availability === null,
  'perfil publico NAO expoe valor/hora nem disponibilidade para anon');
// empresa logada ve os tres campos; profissional logado nao ve
{
  const rEmp = await comoUsuario(ids.empresaSP, 'select * from public.get_professional_public($1)', [ids.prof]);
  ok(Number(rEmp[0].hourly_rate) === 90 && rEmp[0].availability && rEmp[0].availability.length === 1,
    'empresa logada ve valor/hora e disponibilidade no perfil publico');
  const rProf = await comoUsuario(ids.viewer, 'select * from public.get_professional_public($1)', [ids.prof]);
  ok(rProf[0].hourly_rate === null && rProf[0].availability === null,
    'profissional logado NAO ve valor/hora nem disponibilidade de outro profissional');
  const rEmpBusca = await comoUsuario(ids.empresaSP, 'select * from public.search_professionals(null, null, null)');
  ok(rEmpBusca.some((x) => Number(x.hourly_rate) === 90), 'empresa logada ve valor/hora na busca');
}

// ---------- area logada NAO acessivel por anon ----------
res = await comoAnon('select * from public.search_companies(null, null, null)');
ok(negado(res), 'anon NAO executa search_companies (area logada)');
res = await comoAnon('select * from public.admin_denuncias_avaliacoes()');
ok(negado(res), 'anon NAO executa admin_denuncias_avaliacoes');
res = await comoAnon('select * from public.avaliacoes_pendentes()');
ok(negado(res), 'anon NAO executa avaliacoes_pendentes');
res = await comoAnon('select * from public.messaging_disponivel()');
ok(negado(res), 'anon NAO executa messaging_disponivel');
res = await comoAnon('select * from public.minhas_avaliacoes()');
ok(negado(res), 'anon NAO executa minhas_avaliacoes');
res = await comoAnon('select * from public.listar_contratos()');
ok(negado(res), 'anon NAO executa listar_contratos');
res = await comoAnon('select id, score from public.ratings');
ok(negado(res), 'anon NAO le a tabela ratings diretamente');

// ---------- authenticated segue funcionando ----------
let r = await comoUsuario(ids.viewer, 'select * from public.search_companies(null, null, null)');
ok(nomes(r).includes('Empresa SP Teste'), 'authenticated segue vendo search_companies com shape completo');
ok('needs' in r[0], 'area logada continua recebendo needs');
r = await comoUsuario(ids.viewer, 'select * from public.search_companies_public(null, null, null)');
ok(nomes(r).includes('Empresa SP Teste'), 'authenticated tambem executa a vitrine de empresas');


// ---------- bypass: SELECT direto, views e catalogo ----------
res = await comoAnon('select hourly_rate, availability, linkedin_url from public.professionals');
ok(negado(res), 'anon NAO le public.professionals diretamente (sem grant de tabela)');
res = await comoAnon('select display_name from public.profiles');
ok(negado(res), 'anon NAO le public.profiles diretamente (sem grant de tabela)');
{
  const r = await comoUsuario(ids.viewer, 'select hourly_rate, availability, linkedin_url from public.professionals');
  ok(r.length === 1 && r[0].hourly_rate === null,
    'profissional logado: SELECT direto em professionals retorna so a propria linha (RLS profile_id=uid)');
  const rAlvo = await comoUsuario(ids.viewer,
    'select hourly_rate, availability, linkedin_url from public.professionals where profile_id = $1', [ids.prof]);
  ok(rAlvo.length === 0, 'profissional logado NAO le linha de OUTRO profissional por SELECT direto (RLS bloqueia)');
  const rOwn = await comoUsuario(ids.prof, 'select hourly_rate from public.professionals');
  ok(rOwn.length === 1 && Number(rOwn[0].hourly_rate) === 90, 'dono le a propria linha (edicao de perfil preservada)');
  const rEmp = await comoUsuario(ids.empresaSP, 'select hourly_rate, linkedin_url from public.professionals');
  ok(rEmp.length === 0, 'empresa logada tambem NAO ve professionals por SELECT direto (RLS: so dono/admin)');
  const views = await db.query(`select table_name from information_schema.views where table_schema = 'public'`);
  ok(views.rows.length === 0, 'nenhuma view em public expoe colunas');
  const sensiveis = await db.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and pg_get_function_result(p.oid) ~ 'hourly_rate|availability|linkedin_url'`);
  const nomesFn = sensiveis.rows.map((x) => x.proname).sort();
  ok(nomesFn.join(',') === 'get_professional_public,search_professionals',
    'so os dois RPCs reconciliados retornam linkedin/valor/hora/disponibilidade (gate interno por role)');
}

console.log(`\n${pass} ok, ${fail} falhas`);
await db.close();
process.exit(fail ? 1 : 0);
