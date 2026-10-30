// Teste local (PGlite) da RPC public.search_companies e do rascunho
// supabase/drafts/draft_busca_empresas_exclui_teste.sql.
//
// Roda a cadeia REAL de migracoes do repositorio (supabase/migrations/*.sql)
// sobre um Postgres embarcado, com shims minimos de auth/storage (PGlite nao
// tem os schemas do Supabase). Depois exercita a funcao como role
// authenticated com claims de JWT de usuarios distintos, a mesma leitura que
// o PostgREST faz.
//
// Como rodar:  npm run test:rpc
//
// Nao toca em producao; tudo acontece em memoria no processo do teste.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const dirMigrations = path.join(raiz, '..', 'migrations');
// A migracao sob teste (is_test na busca de empresas) e aplicada por ultimo,
// separada da cadeia, para medir o comportamento antes e depois.
const ARQ_MIGRACAO_TESTE = '20261030210000_busca_empresas_exclui_teste.sql';

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
// Remove a linha do extension antes de aplicar a migracao real.
const aplicar = async (sql) => {
  const limpo = sql.replace(/create extension if not exists pgcrypto;/i, '');
  await db.exec(limpo);
};

// ---------- cadeia real de migracoes ----------
const arquivos = readdirSync(dirMigrations)
  .filter((f) => f.endsWith('.sql') && f !== ARQ_MIGRACAO_TESTE)
  .sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(true, `cadeia real aplicada (${arquivos.length} migracoes, sem a migracao sob teste)`);

// ---------- fixtures ----------
// Usuarios: empresa aprovada SP, empresa pendente, empresa aprovada de teste,
// empresa aprovada RJ/saude, profissional comum (visualizador) e profissional
// no gate de validacao.
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
ids.empresaRJ = await criarUsuario('rj@teste.local', { role: 'company', display_name: 'Empresa RJ Teste' });
ids.viewer = await criarUsuario('viewer@teste.local', { role: 'professional', display_name: 'Prof Viewer' });
ids.gate = await criarUsuario('gate@teste.local', { role: 'professional', display_name: 'Prof Gate' });

await db.query(`update public.companies set segment = 'Indústria Metalúrgica', employee_count = '101-500',
  description = 'desc', needs = array['PCMSO'] where profile_id = $1`, [ids.empresaSP]);
await db.query(`update public.profiles set city = 'São Paulo', state = 'SP' where id = $1`, [ids.empresaSP]);
await db.query(`update public.profiles set city = 'Rio de Janeiro', state = 'RJ' where id = $1`, [ids.empresaRJ]);
await db.query(`update public.companies set segment = 'Saúde' where profile_id = $1`, [ids.empresaRJ]);
// A migracao 20261029220000 aprova cadastros automaticamente (decisao de
// produto de 29/10); para exercitar o filtro, forcamos esta empresa a
// pendente DEPOIS do insert, estado ainda possivel para linhas antigas.
await db.query(`update public.profiles set verification_status = 'pending' where id = $1`, [ids.empresaPend]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.empresaTeste]);
await db.query(`insert into private.messaging_allowlist (user_id) values ($1)`, [ids.gate]);

// executa como um usuario autenticado especifico (mesma leitura do PostgREST)
const comoUsuario = async (uid, sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  const r = await db.query(sql, params);
  await db.query('rollback');
  return r.rows;
};
const buscar = (uid, estado = null, cidade = null, segmento = null) =>
  comoUsuario(uid, 'select * from public.search_companies($1, $2, $3)', [estado, cidade, segmento]);
const nomes = (rows) => rows.map((r) => r.display_name).sort();

// ---------- antes do migracao: comportamento atual ----------
let r = await buscar(ids.viewer);
ok(nomes(r).includes('Empresa SP Teste') && nomes(r).includes('Empresa RJ Teste'), 'atual: empresas aprovadas aparecem');
ok(!nomes(r).includes('Empresa Pendente'), 'atual: pendente NAO aparece');
ok(nomes(r).includes('Empresa IsTest'), 'atual: is_test APARECE (gap que a migracao fecha)');

// ---------- aplica o rascunho real ----------
await aplicar(readFileSync(path.join(dirMigrations, ARQ_MIGRACAO_TESTE), 'utf8'));
ok(true, 'migracao sob teste aplicada sem erro');

r = await buscar(ids.viewer);
ok(nomes(r).includes('Empresa SP Teste') && nomes(r).includes('Empresa RJ Teste'), 'migracao: aprovadas continuam aparecendo');
ok(!nomes(r).includes('Empresa Pendente'), 'migracao: pendente continua fora');
ok(!nomes(r).includes('Empresa IsTest'), 'migracao: is_test some para usuario comum');

r = await buscar(ids.gate);
ok(nomes(r).includes('Empresa IsTest'), 'migracao: conta do gate de validacao ainda ve is_test');

// ---------- filtros ----------
r = await buscar(ids.viewer, 'SP');
ok(nomes(r).length === 1 && nomes(r)[0] === 'Empresa SP Teste', 'filtro estado SP retorna so a empresa de SP');
r = await buscar(ids.viewer, 'sp');
ok(nomes(r).length === 1, 'filtro estado aceita minusculas (upper no SQL)');
r = await buscar(ids.viewer, null, 'são');
ok(nomes(r).length === 1 && nomes(r)[0] === 'Empresa SP Teste', 'filtro cidade parcial (ilike) encontra Sao Paulo');
r = await buscar(ids.viewer, null, null, 'metal');
ok(nomes(r).length === 1 && nomes(r)[0] === 'Empresa SP Teste', 'filtro segmento parcial (ilike) encontra Metalurgica');
r = await buscar(ids.viewer, 'RJ', 'são');
ok(r.length === 0, 'filtros combinados sem intersecao retornam vazio (nao erro)');

// ---------- shape da linha (o frontend usa estes campos) ----------
r = await buscar(ids.viewer, 'SP');
const row = r[0];
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
ok(uuidRe.test(row.id), 'id e uuid (vai para /mensagens-profissional?para=)');
ok(row.id === ids.empresaSP, 'id da linha e o profile_id da empresa (mesmo id usado como destinatario)');
const campos = Object.keys(row).sort();
const esperado = ['avatar_path', 'city', 'description', 'display_name', 'employee_count', 'id', 'needs', 'segment', 'state', 'verification_status'];
ok(JSON.stringify(campos) === JSON.stringify(esperado), 'shape tem exatamente os campos esperados, sem email/telefone/cnpj');
ok(Array.isArray(row.needs) || row.needs === null, 'needs e array');

// ---------- permissao: anon nao executa ----------
let anonNegado = false;
try {
  await db.query('begin');
  await db.query('set local role anon');
  await db.query(`select set_config('request.jwt.claims', '', true)`);
  await db.query('select * from public.search_companies(null, null, null)');
  await db.query('rollback');
} catch (e) {
  anonNegado = /permission denied/i.test(e.message);
  await db.query('rollback');
}
ok(anonNegado, 'anon (nao logado) nao executa a RPC');

console.log(`\n${pass} ok, ${fail} falhas`);
await db.close();
process.exit(fail ? 1 : 0);
