// Teste local (PGlite) da RLS/storage do modulo de treinamentos.
//
// Roda a cadeia REAL de migracoes (supabase/migrations/*.sql, incluindo
// 20261030230000_trainings.sql) sobre Postgres embarcado, com os mesmos
// shims minimos de auth/storage de search_companies.test.mjs. Depois exercita
// as policies como role authenticated com claims de JWT de usuarios
// distintos, a mesma leitura que o PostgREST faz.
//
// Contrato verificado:
//   - membro aprovado le apenas publicados do proprio publico (papel trocado
//     e rascunho ficam fora), inclusive em acesso direto por ID;
//   - membro NAO aprovado nao le nada;
//   - membro nao insere/atualiza/exclui;
//   - admin (role admin) faz tudo, inclusive rascunho;
//   - storage 'trainings': membro nao le nem escreve; admin escreve/remove;
//   - check: treinamento precisa de conteudo; pdf_path so no formato
//     <uuid>.pdf; link_url so http/https.
//
// Como rodar:  npm run test:trainings
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

// ---------- shims (mesmos de search_companies.test.mjs) ----------
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
  -- No Supabase real, authenticated ja tem grants no schema storage; o shim
  -- precisa reproduzi-los para que o teste exercite as POLICIES (e nao a
  -- falta de grant).
  -- No Supabase real, authenticated tem USAGE no schema auth e EXECUTE em
  -- auth.uid() por padrao; o shim reproduz isso para as policies chamarem
  -- auth.uid() como invoker (o teste de RPC existente nao precisava, pois a
  -- funcao e security definer).
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  grant usage on schema storage to authenticated;
  grant select on storage.buckets to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
`);

const aplicar = async (sql) => {
  const limpo = sql.replace(/create extension if not exists pgcrypto;/i, '');
  await db.exec(limpo);
};

// ---------- cadeia real de migracoes + rascunho de treinamentos ----------
const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(true, `cadeia real aplicada (${arquivos.length} migracoes, inclui trainings)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ids = {};
ids.admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
ids.prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Aprovado' });
ids.empresa = await criarUsuario('empresa@teste.local', { role: 'company', display_name: 'Empresa Aprovada' });
ids.pendente = await criarUsuario('pend@teste.local', { role: 'professional', display_name: 'Prof Pendente' });
ids.profTeste = await criarUsuario('profteste@teste.local', { role: 'professional', display_name: 'Prof de Teste' });
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.profTeste]);
await db.query(`update public.profiles set verification_status = 'pending' where id = $1`, [ids.pendente]);
// O trigger de cadastro nao promove role admin a partir do metadata; ajuste
// direto de fixture (mesmo estado de producao, onde o admin foi promovido).
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);

// Leituras e tentativas de escrita negadas usam rollback; mutacoes legitimas
// do admin que os proximos passos precisam enxergar usam commit.
const comoUsuario = async (uid, sql, params = [], commit = false) => {
  await db.query('begin');
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  let r, erro = null;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    erro = e;
  }
  await db.query(commit && !erro ? 'commit' : 'rollback');
  return { rows: r?.rows ?? [], erro };
};

// Admin cadastra 4 treinamentos via RLS (como a UI faria)
const criar = (titulo, audience, status, extras = {}) =>
  comoUsuario(ids.admin,
    `insert into public.trainings (title, audience, status, created_by, youtube_url, pdf_path, link_url)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [titulo, audience, status, ids.admin,
     extras.youtube ?? null, extras.pdf ?? null, extras.link ?? null], true);

let r = await criar('Trein. ambos publicado', 'both', 'published', { youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
ok(r.rows.length === 1 && !r.erro, 'admin cria treinamento');
const idAmbos = r.rows[0].id;
r = await criar('Trein. empresa publicado', 'company', 'published', { link: 'https://exemplo.com/material' });
const idEmpresa = r.rows[0].id;
r = await criar('Trein. prof publicado', 'professional', 'published', { pdf: '11111111-1111-1111-1111-111111111111.pdf' });
const idProf = r.rows[0].id;
r = await criar('Trein. rascunho', 'both', 'draft', { pdf: '22222222-2222-2222-2222-222222222222.pdf' });
const idRascunho = r.rows[0].id;

// ---------- visibilidade de membros ----------
const listar = (uid) => comoUsuario(uid, 'select id from public.trainings order by title');
r = await listar(ids.prof);
const idsProf = r.rows.map((x) => x.id);
ok(idsProf.includes(idAmbos) && idsProf.includes(idProf), 'profissional ve publicados de ambos+profissional');
ok(!idsProf.includes(idEmpresa), 'profissional NAO ve treinamento so de empresa (papel trocado)');
ok(!idsProf.includes(idRascunho), 'profissional NAO ve rascunho');

r = await listar(ids.empresa);
const idsEmp = r.rows.map((x) => x.id);
ok(idsEmp.includes(idAmbos) && idsEmp.includes(idEmpresa), 'empresa ve publicados de ambos+empresa');
ok(!idsEmp.includes(idProf), 'empresa NAO ve treinamento so de profissional (papel trocado)');
ok(!idsEmp.includes(idRascunho), 'empresa NAO ve rascunho');

r = await listar(ids.pendente);
ok(r.rows.length === 0, 'membro NAO aprovado nao ve nada');

// acesso direto por ID (adivinhando o uuid) tambem passa pela RLS
r = await comoUsuario(ids.prof, 'select id from public.trainings where id = $1', [idEmpresa]);
ok(r.rows.length === 0, 'acesso direto por ID de outro publico retorna vazio');
r = await comoUsuario(ids.prof, 'select id from public.trainings where id = $1', [idRascunho]);
ok(r.rows.length === 0, 'acesso direto por ID de rascunho retorna vazio');

// admin ve tudo, inclusive rascunho
r = await listar(ids.admin);
ok(r.rows.length === 4, 'admin ve todos, inclusive rascunho');

// despublicar esconde imediatamente do membro
await comoUsuario(ids.admin, `update public.trainings set status = 'draft' where id = $1`, [idProf], true);
r = await comoUsuario(ids.prof, 'select id from public.trainings where id = $1', [idProf]);
ok(r.rows.length === 0, 'apos despublicar, membro nao ve mais (PDF incluso)');
await comoUsuario(ids.admin, `update public.trainings set status = 'published' where id = $1`, [idProf], true);

// ---------- escrita por membro e negada ----------
r = await criar.bind(null) && await comoUsuario(ids.prof,
  `insert into public.trainings (title, audience, status, created_by, link_url)
   values ('invasao', 'both', 'published', $1, 'https://x.com')`, [ids.prof]);
ok(r.rows.length === 0, 'membro nao insere (policy admin)');
r = await comoUsuario(ids.prof, `update public.trainings set status = 'draft' where id = $1 returning id`, [idAmbos]);
ok(r.rows.length === 0, 'membro nao atualiza');
r = await comoUsuario(ids.prof, `delete from public.trainings where id = $1 returning id`, [idAmbos]);
ok(r.rows.length === 0, 'membro nao exclui');

// ---------- checks de integridade ----------
r = await criar('Sem conteudo', 'both', 'draft');
ok(!!r.erro, 'check exige ao menos um conteudo');
r = await criar('PDF estranho', 'both', 'draft', { pdf: '../outro/arquivo.pdf' });
ok(!!r.erro, 'check rejeita pdf_path fora do formato <uuid>.pdf');
r = await criar('Link javascript', 'both', 'draft', { link: 'javascript:alert(1)' });
ok(!!r.erro, 'check rejeita link_url que nao e http/https');

// ---------- storage do bucket trainings ----------
r = await comoUsuario(ids.prof,
  `insert into storage.objects (bucket_id, name, owner) values ('trainings', $1, $2) returning id`,
  [`${idProf}.pdf`, ids.prof]);
ok(!!r.erro || r.rows.length === 0, 'membro nao escreve no bucket trainings');
// Sem RETURNING: o design nao tem policy de SELECT no bucket (membro le so
// via Edge Function), e RETURNING exige policy de select na linha nova.
r = await comoUsuario(ids.admin,
  `insert into storage.objects (bucket_id, name, owner) values ('trainings', $1, $2)`,
  [`${idProf}.pdf`, ids.admin], true);
ok(!r.erro, 'admin escreve no bucket trainings');
let sup = await db.query(`select count(*)::int n from storage.objects where bucket_id = 'trainings'`);
ok(sup.rows[0].n === 1, 'objeto ficou gravado (conferido como superuser)');
r = await comoUsuario(ids.prof,
  `select id from storage.objects where bucket_id = 'trainings'`);
ok(r.rows.length === 0, 'membro nao le objeto EXISTENTE do bucket trainings (leitura so via Edge Function)');
r = await comoUsuario(ids.admin,
  `delete from storage.objects where bucket_id = 'trainings'`, [], true);
sup = await db.query(`select count(*)::int n from storage.objects where bucket_id = 'trainings'`);
if (r.erro) console.log('  [delete erro]', r.erro.message);
ok(!r.erro && sup.rows[0].n === 0, 'admin remove objeto do bucket trainings');

// ---------- guarda is_test (conteudo de teste nunca aparece a membros) ----------
r = await db.query(
  `insert into public.trainings (title, audience, status, created_by, link_url, is_test)
   values ('TESTE isolamento', 'both', 'published', $1, 'https://exemplo.com/t', true) returning id`,
  [ids.admin]);
ok(r.rows.length === 1, 'service cria treinamento de teste (is_test=true)');
const idTeste = r.rows[0].id;

r = await listar(ids.prof);
ok(!r.rows.map((x) => x.id).includes(idTeste), 'profissional NAO ve publicado de teste');
r = await listar(ids.emp);
ok(!r.rows.map((x) => x.id).includes(idTeste), 'empresa NAO ve publicado de teste');
r = await listar(ids.admin);
ok(r.rows.map((x) => x.id).includes(idTeste), 'admin ve o treinamento de teste');

r = await comoUsuario(ids.admin, 'update public.trainings set is_test = true where id = $1', [idAmbos], true);
ok(!!r.erro, 'nem admin via PostgREST marca is_test (trigger bloqueia)');
r = await comoUsuario(ids.admin,
  `insert into public.trainings (title, audience, status, created_by, link_url, is_test)
   values ('x', 'both', 'draft', $1, 'https://exemplo.com/x', true)`, [ids.admin], true);
ok(!!r.erro, 'nem admin via PostgREST insere is_test=true');
r = await comoUsuario(ids.prof, 'select id from public.trainings where id = $1', [idTeste]);
ok(r.rows.length === 0, 'acesso direto por ID ao treinamento de teste retorna vazio');
r = await listar(ids.profTeste);
ok(r.rows.map((x) => x.id).includes(idTeste), 'membro DE TESTE ve publicado de teste (fluxo positivo)');
ok(r.rows.map((x) => x.id).includes(idAmbos), 'membro de teste tambem ve conteudo real do seu publico');

console.log(`\n${pass} ok, ${fail} falhas`);
await db.close();

