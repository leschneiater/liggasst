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
ok(arquivos.includes('20261031120000_oauth_cadastro_incompleto.sql')
   && arquivos.includes('20261031120100_completar_cadastro.sql')
   && arquivos.includes('20261031120200_linkedin_url.sql'),
   `cadeia real aplicada (${arquivos.length} migracoes, inclui oauth + linkedin)`);

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
const perfil = async (uid) => (await db.query(
  `select role, verification_status, display_name from public.profiles where id = $1`, [uid])).rows[0];

// Usuarios: oauth sem papel, oauth que escolhe empresa, oauth com atividade
// simulada, legacy pendente, profissional aprovado normal, empresa normal.
const oauthProf = await criarUsuario('oauthprof@teste.local', { full_name: 'Prof OAuth' });
const oauthEmp = await criarUsuario('oauthemp@teste.local', { name: 'Empresa OAuth' });
const oauthAtivo = await criarUsuario('oauthativo@teste.local', { full_name: 'Prof Ativo' });
const legacy = await criarUsuario('legacy@teste.local', { role: 'professional', display_name: 'Legacy' });
const profOk = await criarUsuario('profok@teste.local', { role: 'professional', display_name: 'Prof Ok' });
const empOk = await criarUsuario('empok@teste.local', { role: 'company', display_name: 'Empresa Ok' });
await db.query(`update public.profiles set verification_status = 'pending' where id = $1`, [legacy]);

// ---------- nascimento OAuth ----------
{
  const p = await perfil(oauthProf);
  ok(p.verification_status === 'awaiting_completion', 'oauth sem role nasce awaiting_completion');
  ok(p.role === 'professional', 'oauth sem role mantem default professional (ate concluir)');
  ok(p.display_name === 'Prof OAuth', 'display_name vem do full_name do provedor');
}
{
  const p = await perfil(profOk);
  ok(p.verification_status === 'approved', 'cadastro com role (e-mail+senha) continua nascendo approved');
}
{
  const p = await perfil(legacy);
  ok(p.verification_status === 'pending', 'fixture legacy pendente criada');
}

// ---------- invisibilidade e bloqueios antes de concluir ----------
{
  const r = await comoUsuario(empOk, `select id from public.search_professionals(null, null, null)`);
  const ids = r.rows.map((x) => x.id);
  ok(!ids.includes(oauthProf) && ids.includes(profOk), 'busca NAO lista awaiting; lista approved');
}
{
  const r = await comoUsuario(empOk, `select id from public.get_professional_public($1::uuid)`, [oauthProf]);
  ok(r.rows.length === 0, 'perfil publico de awaiting retorna vazio');
}
ok(await esperaErro(oauthProf,
  `insert into public.messages (sender_id, receiver_id, content) values ($1, $2, 'oi')`,
  [oauthProf, empOk]),
  'awaiting NAO envia mensagem (gate approved)');

// ---------- conclusao feliz: empresa ----------
await comoUsuario(oauthEmp, `select public.completar_cadastro('company', 'Empresa OAuth LTDA')`);
{
  const p = await perfil(oauthEmp);
  ok(p.role === 'company' && p.verification_status === 'approved' && p.display_name === 'Empresa OAuth LTDA',
    'conclusao empresa: role company + approved + nome');
  const pr = await db.query(`select 1 from public.professionals where profile_id = $1`, [oauthEmp]);
  const co = await db.query(`select 1 from public.companies where profile_id = $1`, [oauthEmp]);
  ok(pr.rows.length === 0 && co.rows.length === 1, 'linha professionals removida; companies criada');
}

// ---------- recusas ----------
ok(await esperaErro(oauthEmp, `select public.completar_cadastro('company', 'De novo')`),
  'segunda conclusao rejeitada');
ok(await esperaErro(oauthProf, `select public.completar_cadastro('admin', 'X')`),
  'papel admin rejeitado na RPC');
ok(await esperaErro(oauthProf, `select public.completar_cadastro('professional', '   ')`),
  'nome vazio rejeitado');
ok(await esperaErro(legacy, `select public.completar_cadastro('professional', 'Legacy')`),
  'legacy PENDING nao conclui por conta propria (RPC)');
ok(await esperaErro(legacy,
  `update public.profiles set verification_status = 'approved' where id = $1`, [legacy]),
  'legacy PENDING nao se auto-aprova (grant de coluna + guard)');
ok(await esperaErro(profOk,
  `update public.profiles set role = 'company' where id = $1`, [profOk]),
  'approved nao troca de papel por update direto (grant de coluna + guard)');
ok(await esperaErro(oauthProf,
  `update public.profiles set role = 'admin', verification_status = 'approved' where id = $1`, [oauthProf]),
  'awaiting nao vira admin por update direto (grant de coluna + guard)');
ok(await esperaErro(oauthProf,
  `update public.profiles set verification_status = 'approved', display_name = 'Prof OAuth' where id = $1`,
  [oauthProf]),
  'update direto de verification_status negado: RPC e o UNICO caminho (grant de coluna)');

// ---------- caminho RPC valido: professional ----------
await comoUsuario(oauthProf, `select public.completar_cadastro('professional', 'Prof OAuth')`);
{
  const p = await perfil(oauthProf);
  ok(p.verification_status === 'approved' && p.role === 'professional' && p.display_name === 'Prof OAuth',
    'conclusao professional via RPC: approved + nome');
  const pr = await db.query(`select 1 from public.professionals where profile_id = $1`, [oauthProf]);
  ok(pr.rows.length === 1, 'trigger manteve linha professionals coerente');
}

// ---------- atividade bloqueia conclusao ----------
{
  // simula estado impossivel via regras normais: mensagem envolvendo awaiting
  await db.query(
    `insert into public.messages (sender_id, receiver_id, content) values ($1, $2, 'historico')`,
    [empOk, oauthAtivo]);
}
ok(await esperaErro(oauthAtivo, `select public.completar_cadastro('company', 'Empresa Ativa')`),
  'conta com atividade NAO conclui nem troca papel (RPC)');
ok(await esperaErro(oauthAtivo,
  `update public.profiles set verification_status = 'approved' where id = $1`, [oauthAtivo]),
  'conta com atividade NAO conclui por update direto (grant + guard)');
{
  const p = await perfil(oauthAtivo);
  ok(p.verification_status === 'awaiting_completion', 'conta com atividade segue awaiting');
}

// ---------- linkedin ----------
ok(await esperaErro(profOk,
  `update public.professionals set linkedin_url = 'https://evil.example.com/x' where profile_id = $1`,
  [profOk]),
  'URL fora do linkedin.com rejeitada (constraint)');
ok(await esperaErro(profOk,
  `update public.professionals set linkedin_url = 'http://www.linkedin.com/in/x' where profile_id = $1`,
  [profOk]),
  'URL http (sem TLS) rejeitada');
await comoUsuario(profOk,
  `update public.professionals set linkedin_url = 'https://www.linkedin.com/in/prof-ok', hourly_rate = 120, availability = array['Tardes'] where profile_id = $1`,
  [profOk]);
{
  // Audiencia decidida pela usuaria (31/10): LinkedIn so para EMPRESAS logadas.
  const r = await comoUsuario(empOk, `select linkedin_url from public.get_professional_public($1::uuid)`, [profOk]);
  ok(r.rows.length === 1 && r.rows[0].linkedin_url === 'https://www.linkedin.com/in/prof-ok',
    'empresa logada ve linkedin_url no perfil publico');
  const r2 = await comoUsuario(empOk, `select linkedin_url from public.search_professionals(null, null, null)`);
  const linha = r2.rows.find((x) => x.linkedin_url);
  ok(linha && linha.linkedin_url === 'https://www.linkedin.com/in/prof-ok', 'empresa logada ve linkedin_url na busca');
  // Profissional logado NAO ve o link de outro profissional:
  const r3 = await comoUsuario(profOk, `select linkedin_url from public.get_professional_public($1::uuid)`, [profOk]);
  ok(r3.rows.length === 1 && r3.rows[0].linkedin_url === null,
    'profissional logado NAO ve linkedin_url de outro profissional');
  const r4 = await comoUsuario(profOk, `select linkedin_url from public.search_professionals(null, null, null)`);
  ok(r4.rows.every((x) => x.linkedin_url === null),
    'profissional logado NAO ve linkedin_url na busca');
  // Valor/hora e disponibilidade (decisao 31/10, "Concordo!"): mesma audiencia.
  const r5 = await comoUsuario(empOk, `select hourly_rate, availability from public.get_professional_public($1::uuid)`, [profOk]);
  ok(Number(r5.rows[0].hourly_rate) === 120 && r5.rows[0].availability && r5.rows[0].availability.length === 1,
    'empresa logada ve valor/hora e disponibilidade');
  const r6 = await comoUsuario(profOk, `select hourly_rate, availability from public.get_professional_public($1::uuid)`, [profOk]);
  ok(r6.rows[0].hourly_rate === null && r6.rows[0].availability === null,
    'profissional logado NAO ve valor/hora nem disponibilidade de outro profissional');
}

// ---------- anon: executa a vitrine, mas linkedin vem null ----------
{
  const r = await comoUsuario(null, `select linkedin_url from public.search_professionals(null, null, null)`, [], 'anon');
  ok(r.rows.length > 0 && r.rows.every((x) => x.linkedin_url === null),
    'anon executa a vitrine e linkedin_url vem NULL');
  const r2 = await comoUsuario(null, `select linkedin_url from public.get_professional_public($1::uuid)`, [profOk], 'anon');
  ok(r2.rows.length === 1 && r2.rows[0].linkedin_url === null,
    'anon abre perfil publico com linkedin_url NULL');
}
ok(await esperaErro(null, `select public.completar_cadastro('company', 'X')`, [], 'anon'),
  'anon NAO executa completar_cadastro');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
