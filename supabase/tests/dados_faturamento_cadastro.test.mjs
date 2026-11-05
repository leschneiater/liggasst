// Teste local (PGlite) da migracao 20261109010000_dados_faturamento_cadastro:
// dados de faturamento (CPF/CNPJ, celular, endereco) coletados no cadastro
// desde 05/11. Mesmo harness de oauth_completar_cadastro.test.mjs: cadeia
// REAL de migracoes, shims de auth/storage, roles authenticated/anon.
// Nao toca em producao.
//
// Decisoes verificadas:
//   - cadastro e-mail+senha (metadata completa) grava telefone, CEP,
//     endereco, numero, bairro em profiles e CPF/CNPJ na tabela do papel;
//   - completar_cadastro exige os dados de faturamento com a validacao do
//     formulario (CPF 11 / CNPJ 14, CEP 8, celular 10-11) e grava tudo;
//   - a assinatura antiga da RPC (2 args) nao existe mais;
//   - dono edita os proprios dados de faturamento (grant por coluna), mas
//     NAO altera role/status; anon nao le perfil alheio;
//   - exclusao da conta apaga os dados em cascata.

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
ok(arquivos.includes('20261109010000_dados_faturamento_cadastro.sql'),
   `cadeia real aplicada (${arquivos.length} migracoes, inclui dados_faturamento)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};

const comoUsuario = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin');
  await db.query(`set local role ${role}`);
  if (uid) {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  }
  let r;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
  await db.query('commit');
  return r;
};
const esperaErro = async (uid, sql, params = [], role = 'authenticated') => {
  try { await comoUsuario(uid, sql, params, role); return false; } catch { return true; }
};

const FAT_PROF = `'professional', 'Prof OAuth', '123.456.789-00', '(11) 98765-4321', '01310-100', 'Av. Paulista', '1000', 'Bela Vista'`;
const FAT_EMP = (nome) => `'company', '${nome}', '12.345.678/0001-90', '(11) 98765-4321', '01310-100', 'Av. Paulista', '1000', 'Bela Vista'`;

// ---------- cadastro e-mail+senha grava os dados de faturamento ----------
const prof = await criarUsuario('prof@teste.local', {
  role: 'professional', display_name: 'Prof Teste', cpf: '123.456.789-00',
  phone: '(11) 98765-4321', postal_code: '01310-100', address: 'Av. Paulista',
  address_number: '1000', province: 'Bela Vista',
});
{
  const p = (await db.query(
    `select phone, postal_code, address, address_number, province, verification_status
     from public.profiles where id = $1`, [prof])).rows[0];
  ok(p.phone === '(11) 98765-4321' && p.postal_code === '01310-100'
     && p.address === 'Av. Paulista' && p.address_number === '1000' && p.province === 'Bela Vista',
     'cadastro grava telefone, CEP, endereco, numero e bairro em profiles');
  ok(p.verification_status === 'approved', 'cadastro com papel continua nascendo approved');
  const pr = (await db.query(`select cpf from public.professionals where profile_id = $1`, [prof])).rows[0];
  ok(pr.cpf === '123.456.789-00', 'cadastro grava CPF na tabela do papel');
}
const emp = await criarUsuario('emp@teste.local', {
  role: 'company', display_name: 'Empresa Teste', cnpj: '12.345.678/0001-90',
  phone: '(11) 98765-4321', postal_code: '01310-100', address: 'Av. Paulista',
  address_number: '1000', province: 'Bela Vista',
});
{
  const co = (await db.query(`select cnpj from public.companies where profile_id = $1`, [emp])).rows[0];
  ok(co.cnpj === '12.345.678/0001-90', 'cadastro empresa grava CNPJ na tabela do papel');
  const p = (await db.query(
    `select address_number, province from public.profiles where id = $1`, [emp])).rows[0];
  ok(p.address_number === '1000' && p.province === 'Bela Vista',
     'cadastro empresa grava numero e bairro em profiles');
}
// metadados sensiveis nao voltam para o JWT (sanitizacao mantida)
{
  const u = (await db.query(`select raw_user_meta_data from auth.users where id = $1`, [prof])).rows[0];
  ok(!('cpf' in u.raw_user_meta_data) && !('postal_code' in u.raw_user_meta_data)
     && !('address_number' in u.raw_user_meta_data),
     'metadados de faturamento ficam fora do JWT (sanitizacao mantida)');
}

// ---------- conclusao OAuth exige e grava os dados ----------
const oauth = await criarUsuario('oauth@teste.local', { full_name: 'Prof OAuth' });
{
  const p = (await db.query(
    `select verification_status from public.profiles where id = $1`, [oauth])).rows[0];
  ok(p.verification_status === 'awaiting_completion', 'oauth sem papel nasce awaiting_completion');
}
await comoUsuario(oauth, `select public.completar_cadastro(${FAT_PROF})`);
{
  const p = (await db.query(
    `select role, verification_status, display_name, phone, postal_code, address, address_number, province
     from public.profiles where id = $1`, [oauth])).rows[0];
  ok(p.role === 'professional' && p.verification_status === 'approved'
     && p.display_name === 'Prof OAuth'
     && p.phone === '(11) 98765-4321' && p.postal_code === '01310-100'
     && p.address === 'Av. Paulista' && p.address_number === '1000' && p.province === 'Bela Vista',
     'conclusao OAuth grava papel, nome e dados de faturamento');
  const pr = (await db.query(`select cpf from public.professionals where profile_id = $1`, [oauth])).rows[0];
  ok(pr.cpf === '123.456.789-00', 'conclusao OAuth grava CPF na tabela do papel');
}

// ---------- validacoes da RPC (mesmas do formulario) ----------
const novo = async () => criarUsuario(`u${Math.random()}@teste.local`, { full_name: 'X' });
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '123', '11987654321', '01310100', 'Rua A', '1', 'Centro')`),
   'CPF com tamanho errado rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('company', 'X', '12345678900', '11987654321', '01310100', 'Rua A', '1', 'Centro')`),
   'CNPJ com tamanho errado rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '12345678900', '987654321', '01310100', 'Rua A', '1', 'Centro')`),
   'celular sem DDD rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '12345678900', '11987654321', '0131', 'Rua A', '1', 'Centro')`),
   'CEP com tamanho errado rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '12345678900', '11987654321', '01310100', '  ', '1', 'Centro')`),
   'endereco vazio rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '12345678900', '11987654321', '01310100', 'Rua A', '', 'Centro')`),
   'numero vazio rejeitado');
ok(await esperaErro(await novo(),
  `select public.completar_cadastro('professional', 'X', '12345678900', '11987654321', '01310100', 'Rua A', '1', ' ')`),
   'bairro vazio rejeitado');
{
  const u = await novo();
  ok(await esperaErro(u, `select public.completar_cadastro('professional', 'X', '123', '987', '01', '', '', '')`),
     'rejeicao nao altera a conta');
  const p = (await db.query(
    `select verification_status from public.profiles where id = $1`, [u])).rows[0];
  ok(p.verification_status === 'awaiting_completion', 'conta segue awaiting apos rejeicao');
}

// ---------- assinatura antiga removida ----------
{
  const { rows } = await db.query(
    `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'completar_cadastro'`);
  ok(rows[0].n === 1, 'existe UMA assinatura de completar_cadastro (a antiga foi removida)');
  ok(await esperaErro(oauth, `select public.completar_cadastro('company', 'De novo')`),
     'chamada com a assinatura antiga nao existe mais');
}

// ---------- grants e RLS dos dados de faturamento ----------
{
  const r = await comoUsuario(emp,
    `select phone, postal_code, address, address_number, province from public.profiles where id = $1`, [prof]);
  ok(r.rows.length === 0, 'RLS: usuario nao le dados de faturamento de outro');
  ok(await esperaErro(null,
    `select id from public.profiles where id = $1`, [prof], 'anon'),
     'RLS: anon nem privilegio de leitura no perfil tem');
  await comoUsuario(prof,
    `update public.profiles set phone = $1, postal_code = $2, address = $3, address_number = $4, province = $5 where id = $6`,
    ['(11) 91111-2222', '01310-200', 'Rua Nova', '45', 'Centro', prof]);
  const dep = (await db.query(
    `select phone, postal_code, address, address_number, province from public.profiles where id = $1`, [prof])).rows[0];
  ok(dep.phone === '(11) 91111-2222' && dep.postal_code === '01310-200' && dep.address === 'Rua Nova'
     && dep.address_number === '45' && dep.province === 'Centro',
     'dono edita os proprios dados de faturamento (grant por coluna)');
  ok(await esperaErro(prof,
    `update public.profiles set role = 'company' where id = $1`, [prof]),
     'dono NAO altera role nem status (grant por coluna preservado)');
  await comoUsuario(prof, `update public.professionals set cpf = $1 where profile_id = $2`, ['009.876.543-21', prof]);
  ok((await db.query(`select cpf from public.professionals where profile_id = $1`, [prof])).rows[0].cpf === '009.876.543-21',
     'dono corrige o proprio documento na tabela do papel');
}

// ---------- cascata: excluir a conta apaga os dados ----------
await db.query(`delete from auth.users where id = $1`, [emp]);
{
  const { rows } = await db.query(
    `select (select count(*) from public.profiles where id = $1)::int as perfil,
            (select count(*) from public.companies where profile_id = $1)::int as empresa`, [emp]);
  ok(rows[0].perfil === 0 && rows[0].empresa === 0,
     'excluir a conta apaga profile e dados de faturamento em cascata');
}

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
