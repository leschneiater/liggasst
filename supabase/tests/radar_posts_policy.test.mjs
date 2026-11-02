// Teste local (PGlite) da migracao do Radar TST (20261102010000_radar_posts.sql).
//
// Roda a cadeia REAL de migracoes (supabase/migrations/*.sql) sobre Postgres
// embarcado, com os mesmos shims de auth/storage de assinatura_policy.test.mjs,
// e verifica a PROTECAO REAL dos artigos:
//   - a cadeia inteira aplica sem erro com a migracao nova;
//   - anon NAO le artigos (sem grant);
//   - conta gratuita NAO le (RLS, 0 linhas);
//   - pending_first_payment NAO le;
//   - pro_professional e pro_company ativos leem;
//   - canceled/past_due leem ATE o fim do periodo pago, e nao depois;
//   - ISOLAMENTO: assinatura sandbox, mesmo pro ativa, NAO le em producao;
//   - artigo com publicado_em no FUTURO (rascunho/agendado) NAO aparece;
//   - authenticated NAO insere/atualiza/apaga artigos (sem policies de escrita).
//
// Como rodar:  node supabase/tests/radar_posts_policy.test.mjs
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

// ---------- shims (mesmos de assinatura_policy.test.mjs) ----------
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
ok(arquivos.includes('20261102010000_radar_posts.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo radar_posts)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const gratis = await criarUsuario('gratis@teste.local', { role: 'professional', display_name: 'Gratis' });
const proProf = await criarUsuario('proprof@teste.local', { role: 'professional', display_name: 'Pro Prof' });
const proEmp = await criarUsuario('proemp@teste.local', { role: 'company', display_name: 'Pro Emp' });
const pendente = await criarUsuario('pendente@teste.local', { role: 'professional', display_name: 'Pendente' });
const canceladoVigente = await criarUsuario('cancvig@teste.local', { role: 'professional', display_name: 'Canc Vigente' });
const canceladoVencido = await criarUsuario('cancvenc@teste.local', { role: 'professional', display_name: 'Canc Vencido' });

// Estados de assinatura (escrita como superuser: fora da RLS, como o webhook).
const sandbox = await criarUsuario('sandbox@teste.local', { role: 'professional', display_name: 'Sandbox' });

const setSub = (uid, plan, status, fim, env = 'production') => db.query(
  `update public.subscriptions set plan = $2, status = $3, current_period_end = $4, environment = $5 where profile_id = $1`,
  [uid, plan, status, fim, env]);
await setSub(proProf, 'pro_professional', 'active', null);
await setSub(proEmp, 'pro_company', 'active', null);
await setSub(pendente, 'pro_professional', 'pending_first_payment', null);
await setSub(canceladoVigente, 'pro_professional', 'canceled', '2099-01-01');
await setSub(canceladoVencido, 'pro_professional', 'canceled', '2020-01-01');
await setSub(sandbox, 'pro_professional', 'active', null, 'sandbox');

// Tres artigos de EXEMPLO, inseridos como service role faria (fora da RLS):
// um publicado, um AGENDADO para daqui a 1h NO MESMO DIA (nao pode vazar por
// comparacao de data) e um agendado para o futuro distante.
await db.query(
  `insert into public.radar_posts (titulo, resumo, conteudo, publicado_em, status)
   values ('Artigo de teste RLS', 'resumo', 'conteudo', now() - interval '1 hour', 'publicado'),
          ('Agendado ainda hoje', 'resumo', 'conteudo', now() + interval '1 hour', 'publicado'),
          ('Rascunho agendado', 'resumo', 'conteudo', '2099-12-31', 'publicado'),
          ('Rascunho com data passada', 'resumo', 'conteudo', now() - interval '1 day', 'rascunho')`);
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);

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

const contaArtigos = async (uid, role = 'authenticated') => {
  try {
    const r = await comoUsuario(uid, `select id from public.radar_posts`, [], role);
    return r.rows.length;
  } catch {
    return -1; // sem grant
  }
};

// ---------- RLS: leitura ----------
ok((await contaArtigos(null, 'anon')) <= 0, 'anon NAO le artigos (sem grant)');
ok((await contaArtigos(gratis)) === 0, 'conta gratuita NAO le artigos (RLS fail-closed)');
ok((await contaArtigos(pendente)) === 0, 'pending_first_payment NAO le artigos');
ok((await contaArtigos(proProf)) === 1, 'pro_professional ativo le artigos');
ok((await contaArtigos(proEmp)) === 1, 'pro_company ativo le artigos');
ok((await contaArtigos(canceladoVigente)) === 1, 'cancelado DENTRO do periodo pago ainda le');
ok((await contaArtigos(canceladoVencido)) === 0, 'cancelado FORA do periodo NAO le');
ok((await contaArtigos(sandbox)) === 0, 'assinatura SANDBOX pro ativa NAO le em producao (isolamento)');
ok((await contaArtigos(proProf)) === 1,
  'artigo agendado NO FUTURO nao aparece, nem daqui a 1h no mesmo dia (so 1 visivel)');

// ---------- RLS: escrita bloqueada para authenticated ----------
let erro = null;
try {
  await comoUsuario(proEmp,
    `insert into public.radar_posts (titulo, resumo, conteudo) values ('x', 'y', 'z')`);
} catch (e) { erro = e; }
ok(erro !== null, 'authenticated NAO insere artigo (nao admin)');

erro = null;
try {
  await comoUsuario(proEmp, `update public.radar_posts set titulo = 'x'`);
} catch (e) { erro = e; }
const { rows: ainda } = await db.query(`select titulo from public.radar_posts order by publicado_em`);
ok(ainda.length === 4 && !ainda.some((r) => r.titulo === 'x'),
  'authenticated NAO atualiza artigo (nao admin)');

erro = null;
try {
  await comoUsuario(proEmp, `delete from public.radar_posts`);
} catch (e) { erro = e; }
const { rows: depois } = await db.query(`select id from public.radar_posts`);
ok(depois.length === 4, 'authenticated NAO apaga artigo (nao admin)');

// ---------- RASCUNHO e ADMIN (migracao 20261102210000) ----------
ok((await contaArtigos(proProf)) === 1, 'assinante pro NAO ve rascunho (mesmo com data passada)');
ok((await contaArtigos(gratis)) === 0, 'conta gratuita continua sem ler');
ok((await contaArtigos(admin)) === 4, 'admin le tudo, inclusive rascunhos');
ok((await contaArtigos(null, 'anon')) <= 0, 'anon continua sem ler');
const criado = await comoUsuario(admin,
  `insert into public.radar_posts (titulo, resumo, conteudo) values ('QA admin', 'r', 'c') returning id, status`);
ok(criado.rows[0].status === 'rascunho', 'admin cria artigo e ele nasce como rascunho');
ok((await contaArtigos(proProf)) === 1, 'rascunho novo NAO aparece para assinante');
await comoUsuario(admin, `update public.radar_posts set status = 'publicado', publicado_em = now() where id = $1`, [criado.rows[0].id]);
ok((await contaArtigos(proProf)) === 2, 'depois de publicar, assinante pro passa a ver');
ok((await contaArtigos(gratis)) === 0, 'publicado continua invisivel para conta gratuita');
ok((await contaArtigos(sandbox)) === 0, 'publicado continua invisivel para sandbox (isolamento)');
await comoUsuario(admin, `delete from public.radar_posts where id = $1`, [criado.rows[0].id]);
const { rows: restam } = await db.query(`select id from public.radar_posts`);
ok(restam.length === 4, 'admin exclui so o artigo de teste');
const tenta = async (uid, sql) => { try { const r = await comoUsuario(uid, sql); return r.rows.length; } catch { return -1; } };
ok((await tenta(proEmp, `insert into public.radar_posts (titulo, resumo, conteudo, status) values ('x','y','z','publicado') returning id`)) === -1, 'assinante NAO publica (insert negado)');
ok((await tenta(proProf, `update public.radar_posts set status = 'publicado' where titulo = 'Rascunho com data passada' returning id`)) === 0, 'assinante NAO publica rascunho (update 0 linhas)');
ok((await tenta(gratis, `delete from public.radar_posts returning id`)) === 0, 'conta gratuita NAO exclui (0 linhas)');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
