// Teste local (PGlite) da Etapa 2 das trilhas
// (migracao 20261108080000_trilhas_progresso_selos.sql).
//
// Contrato verificado (cadeia REAL de migracoes, roles anon/authenticated):
//   - membro pagante marca a propria secao como concluida; par unico;
//   - membro NAO marca progresso para outro perfil, nem em trilha que nao
//     ve (free em trilha publicada), nem atualiza/apaga progresso;
//   - membro so le o proprio progresso; admin le tudo;
//   - selo nasce so quando TODAS as secoes de uma trilha 'open' publicada
//     estao concluidas; trilha 'certified' nao gera selo; rascunho nao gera;
//   - repetir a ultima conclusao nao duplica o selo (on conflict);
//   - ninguem insere/atualiza/apaga selo diretamente (RLS sem policy de escrita);
//   - leitura de selos: proprio membro, autenticado em perfil nao-teste;
//     RPC publica (anon) devolve selos de perfil real e NADA de perfil is_test;
//   - apagar a trilha cascateia progresso e selos.
//
// Como rodar:  npm run test:trilhas-progresso
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

// ---------- shims (mesmos de trilhas.test.mjs) ----------
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

const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql')).sort();
for (const arq of arquivos) {
  await aplicar(readFileSync(path.join(dirMigrations, arq), 'utf8'));
}
ok(true, `cadeia real aplicada (${arquivos.length} migracoes, inclui progresso+selos)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const ids = {};
ids.admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
ids.prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Pagante' });
ids.prof2 = await criarUsuario('prof2@teste.local', { role: 'professional', display_name: 'Prof Dois' });
ids.free = await criarUsuario('free@teste.local', { role: 'professional', display_name: 'Prof Free' });
ids.profTeste = await criarUsuario('profteste@teste.local', { role: 'professional', display_name: 'Prof de Teste' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
await db.query(`update public.profiles set is_test = true where id = $1`, [ids.profTeste]);
const pagar = async (uid, plano) => db.query(
  `update public.subscriptions
   set plan = $2, status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`,
  [uid, plano]);
await pagar(ids.prof, 'pro_professional');
await pagar(ids.prof2, 'pro_professional');
await pagar(ids.profTeste, 'pro_professional');

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
const comoAnon = async (sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role anon`);
  let r, erro = null;
  try {
    r = await db.query(sql, params);
  } catch (e) {
    erro = e;
  }
  await db.query('rollback');
  return { rows: r?.rows ?? [], erro };
};

// ---------- trilhas de trabalho ----------
const criarTrilha = (titulo, kind, published, isTest = false) =>
  comoUsuario(ids.admin,
    `insert into public.trails (titulo, descricao, audience, kind, published, is_test, ordem)
     values ($1, 'desc', 'professional', $2, $3, $4, 0) returning id`,
    [titulo, kind, published, isTest], true);

let r = await criarTrilha('Trilha Aberta', 'open', true);
const idAberta = r.rows[0].id;
r = await criarTrilha('Trilha Certificada', 'certified', true);
const idCert = r.rows[0].id;
r = await criarTrilha('Trilha Rascunho', 'open', false);
const idRasc = r.rows[0].id;
r = await criarTrilha('Trilha de Teste', 'open', true, true);
const idTeste = r.rows[0].id;

const criarSecao = (trailId, ordem, titulo) =>
  comoUsuario(ids.admin,
    `insert into public.trail_sections (trail_id, ordem, titulo, content_type, conteudo)
     values ($1, $2, $3, 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') returning id`,
    [trailId, ordem, titulo], true);

const sec = {};
for (const [trail, prefixo] of [[idAberta, 'A'], [idCert, 'C'], [idTeste, 'T']]) {
  for (const i of [1, 2]) {
    const rs = await criarSecao(trail, i, `${prefixo}${i}`);
    sec[`${prefixo}${i}`] = rs.rows[0].id;
  }
}
{
  const rs = await criarSecao(idRasc, 1, 'R1');
  sec.R1 = rs.rows[0].id;
}
ok(Object.keys(sec).length === 7, 'secoes criadas (2+2+2+1)');

const concluir = (uid, secao) =>
  comoUsuario(uid,
    `insert into public.trail_section_progress (profile_id, section_id) values ($1, $2) returning id`,
    [uid, secao], true);

const selos = (uid) =>
  db.query(`select trail_id from public.profile_badges where profile_id = $1`, [uid])
    .then((x) => x.rows.map((y) => y.trail_id));

// ---------- RLS de escrita do progresso ----------
r = await concluir(ids.prof, sec.A1);
ok(r.rows.length === 1 && !r.erro, 'pagante conclui secao de trilha visivel');
r = await concluir(ids.prof, sec.A1);
ok(!!r.erro, 'par (perfil, secao) unico: repetir rejeitado');
r = await comoUsuario(ids.prof2,
  `insert into public.trail_section_progress (profile_id, section_id) values ($1, $2)`,
  [ids.prof, sec.A2]);
ok(!!r.erro, 'membro nao marca progresso em nome de outro');
r = await concluir(ids.free, sec.A2);
ok(!!r.erro, 'conta free nao marca progresso (trilha invisivel para ela)');
r = await concluir(ids.prof, sec.R1);
ok(!!r.erro, 'rascunho nao aceita progresso (invisivel para membro)');
r = await comoUsuario(ids.prof,
  `update public.trail_section_progress set completed_at = now() where profile_id = $1`, [ids.prof]);
ok(!!r.erro, 'update de progresso negado (grant so select+insert)');
r = await comoUsuario(ids.prof,
  `delete from public.trail_section_progress where profile_id = $1`, [ids.prof]);
ok(!!r.erro, 'delete de progresso negado (grant so select+insert)');
{
  const n = await db.query(`select count(*) as n from public.trail_section_progress`);
  ok(n.rows[0].n === 1, 'progresso intacto apos tentativas de update/delete');
}

// ---------- RLS de leitura do progresso ----------
r = await comoUsuario(ids.prof, `select count(*) as n from public.trail_section_progress`);
ok(r.rows[0].n === 1, 'membro le so o proprio progresso');
r = await comoUsuario(ids.prof2, `select count(*) as n from public.trail_section_progress`);
ok(r.rows[0].n === 0, 'outro membro nao ve o progresso alheio');
r = await comoUsuario(ids.admin, `select count(*) as n from public.trail_section_progress`);
ok(r.rows[0].n === 1, 'admin le todo o progresso');
r = await comoAnon(`select count(*) as n from public.trail_section_progress`);
ok(!!r.erro || r.rows[0].n === 0, 'anon nao le progresso');

// ---------- concessao do selo ----------
ok((await selos(ids.prof)).length === 0, 'sem selo com 1 de 2 secoes');
r = await concluir(ids.prof, sec.A2);
ok(!r.erro, 'pagante conclui a ultima secao da trilha aberta');
{
  const s = await selos(ids.prof);
  ok(s.length === 1 && s[0] === idAberta, 'selo concedido ao completar trilha open');
}
// certified: completa as duas, sem selo
await concluir(ids.prof, sec.C1);
await concluir(ids.prof, sec.C2);
ok((await selos(ids.prof)).length === 1, 'trilha certified nao gera selo (etapa futura)');
// perfil de teste pagante conclui a trilha de teste: selo interno
await concluir(ids.profTeste, sec.T1);
await concluir(ids.profTeste, sec.T2);
ok((await selos(ids.profTeste)).length === 1, 'trilha is_test tambem concede selo (regra interna)');

// ---------- selo: sem escrita direta ----------
r = await comoUsuario(ids.admin,
  `insert into public.profile_badges (profile_id, trail_id) values ($1, $2)`,
  [ids.prof, idCert]);
ok(!!r.erro, 'nem admin insere selo direto (sem policy de escrita)');
r = await comoUsuario(ids.admin,
  `delete from public.profile_badges where profile_id = $1`, [ids.prof]);
ok(!!r.erro, 'delete de selo negado (grant so select)');

// ---------- leitura de selos ----------
r = await comoUsuario(ids.prof, `select count(*) as n from public.profile_badges`);
ok(r.rows[0].n === 1, 'membro ve o proprio selo');
r = await comoUsuario(ids.prof2, `select count(*) as n from public.profile_badges`);
ok(r.rows[0].n === 1, 'autenticado ve selos de perfis nao-teste (so o do prof)');
r = await comoAnon(`select count(*) as n from public.profile_badges`);
ok(!!r.erro || r.rows[0].n === 0, 'anon nao le a tabela de selos direto');
r = await comoAnon(`select trail_id, trail_titulo from public.profile_badges_publico($1)`, [ids.prof]);
ok(!r.erro && r.rows.length === 1 && r.rows[0].trail_id === idAberta && r.rows[0].trail_titulo === 'Trilha Aberta',
  'RPC publica devolve selo da vitrine com titulo da trilha');
r = await comoAnon(`select count(*) as n from public.profile_badges_publico($1)`, [ids.profTeste]);
ok(!r.erro && r.rows[0].n === 0, 'RPC publica nao devolve selo de perfil is_test');

// selo de perfil is_test: profTeste conclui trilha aberta real tambem
await concluir(ids.profTeste, sec.A1);
await concluir(ids.profTeste, sec.A2);
ok((await selos(ids.profTeste)).length === 2, 'perfil de teste acumula selos (interno)');
r = await comoAnon(`select count(*) as n from public.profile_badges_publico($1)`, [ids.profTeste]);
ok(!r.erro && r.rows[0].n === 0, 'selo de perfil is_test nunca na vitrine publica');
r = await comoUsuario(ids.prof,
  `select count(*) as n from public.profile_badges b join public.profiles p on p.id = b.profile_id where p.is_test = true`);
ok(r.rows[0].n === 0, 'autenticado nao ve selos de perfis is_test na tabela');

// ---------- cascata ----------
await db.query(`delete from public.trails where id = $1`, [idAberta]);
{
  const s = await selos(ids.prof);
  ok(s.length === 0, 'apagar a trilha remove o selo (cascade)');
}
r = await db.query(
  `select count(*) as n from public.trail_section_progress p
   join public.trail_sections s on s.id = p.section_id where s.trail_id = $1`, [idAberta]);
ok(r.rows[0].n === 0, 'apagar a trilha remove o progresso das secoes (cascade)');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
