// Teste local (PGlite) da Etapa 5 das trilhas
// (migracao 20261108120000_trilhas_certificado.sql).
//
// Contrato verificado (cadeia REAL de migracoes, roles anon/authenticated):
//   - trails ganha carga_horaria_min (opcional, > 0);
//   - emissao so autenticado, so trilha certified publicada, so com prova
//     aprovada; trilha open/publicada ou nao publicada rejeita;
//   - certificado sai com codigo LST-XXXXXXXXXX, snapshot de nome/titulo/nota
//     e carga horaria; emissao repetida e idempotente (mesmo codigo, 1 linha);
//   - RLS: membro le so o proprio certificado; admin le tudo; anon nao le a
//     tabela; ninguem insere/atualiza/apaga direto;
//   - verificacao publica: anon executa; codigo valido devolve so os campos
//     publicos (sem profile_id/trail_id); minusculas funcionam; codigo
//     inexistente devolve valido=false.
//
// Como rodar:  npm run test:certificado
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
ok(arquivos.some((f) => f.includes('trilhas_certificado')),
  `cadeia real aplicada (${arquivos.length} migracoes, inclui certificado)`);

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
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
const pagar = async (uid, plano) => db.query(
  `update public.subscriptions
   set plan = $2, status = 'active', current_period_end = current_date + 30, environment = 'production'
   where profile_id = $1`,
  [uid, plano]);
await pagar(ids.prof, 'pro_professional');
await pagar(ids.prof2, 'pro_professional');

const comoUsuario = async (uid, sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role authenticated`);
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  let r, erro = null;
  try { r = await db.query(sql, params); } catch (e) { erro = e; }
  await db.query('rollback');
  return { rows: r?.rows ?? [], erro };
};
const comoAnon = async (sql, params = []) => {
  await db.query('begin');
  await db.query(`set local role anon`);
  let r, erro = null;
  try { r = await db.query(sql, params); } catch (e) { erro = e; }
  await db.query('rollback');
  return { rows: r?.rows ?? [], erro };
};

const { rows: trilhaRows } = await db.query(
  `insert into public.trails (titulo, descricao, audience, kind, published, carga_horaria_min)
   values ('Atualizacao NR-1 2026', 'Conteudo', 'professional', 'certified', true, 120)
   returning id`);
const trilha = trilhaRows[0].id;
const { rows: trilhaOpenRows } = await db.query(
  `insert into public.trails (titulo, descricao, audience, kind, published)
   values ('Trilha aberta', 'Conteudo', 'professional', 'open', true)
   returning id`);
const trilhaOpen = trilhaOpenRows[0].id;
const { rows: trilhaRascunhoRows } = await db.query(
  `insert into public.trails (titulo, descricao, audience, kind, published)
   values ('Trilha rascunho', 'Conteudo', 'professional', 'certified', false)
   returning id`);
const trilhaRascunho = trilhaRascunhoRows[0].id;

// aprovacao do prof (escrita direta: fora de role, como o servidor faria)
await db.query(
  `insert into public.exam_attempts (profile_id, trail_id, attempt_number, finished_at, score, passed, snapshot, mapa)
   values ($1, $2, 1, now(), 80, true, '[]'::jsonb, '[]'::jsonb)`,
  [ids.prof, trilha]);
// prof2 sem aprovacao
await db.query(
  `insert into public.exam_attempts (profile_id, trail_id, attempt_number, finished_at, score, passed, snapshot, mapa)
   values ($1, $2, 1, now(), 60, false, '[]'::jsonb, '[]'::jsonb)`,
  [ids.prof2, trilha]);

// ---------- carga horaria ----------
{
  const { rows } = await db.query(
    `select carga_horaria_min from public.trails where id = $1`, [trilha]);
  ok(rows[0]?.carga_horaria_min === 120, 'trails ganha carga_horaria_min');
  const { erro } = await db.query(
    `update public.trails set carga_horaria_min = 0 where id = $1`, [trilha]).then(r => ({ erro: null, r })).catch(erro => ({ erro }));
  ok(!!erro, 'carga_horaria_min rejeita valor nao positivo');
  await db.query(`update public.trails set carga_horaria_min = 120 where id = $1`, [trilha]);
}

// ---------- emissao ----------
{
  const { erro } = await comoAnon(`select public.trail_certificado_emitir($1)`, [trilha]);
  ok(!!erro, 'anon nao emite certificado');

  const semProva = await comoUsuario(ids.prof2, `select public.trail_certificado_emitir($1)`, [trilha]);
  ok(!!semProva.erro, 'sem aprovacao a emissao rejeita');

  const openTrail = await comoUsuario(ids.prof, `select public.trail_certificado_emitir($1)`, [trilhaOpen]);
  ok(!!openTrail.erro, 'trilha open nao emite certificado');

  const rascunho = await comoUsuario(ids.prof, `select public.trail_certificado_emitir($1)`, [trilhaRascunho]);
  ok(!!rascunho.erro, 'trilha nao publicada nao emite certificado');

  // Emissao gravada de verdade (sem rollback): claims no nivel da sessao,
  // como faria o PostgREST ao chamar a RPC.
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: ids.prof })]);
  const emissao = await db.query(`select public.trail_certificado_emitir($1) as c`, [trilha]);
  const cert = emissao.rows[0]?.c;
  ok(!!cert, 'aprovado emite certificado');
  ok(/^LST-[0-9A-F]{10}$/.test(cert?.codigo ?? ''), `codigo no formato LST-XXXXXXXXXX (${cert?.codigo})`);
  ok(cert?.nome === 'Prof Pagante' && cert?.trilha_titulo === 'Atualizacao NR-1 2026' && cert?.nota === 80 && cert?.carga_horaria_min === 120,
    'snapshot de nome, titulo, nota e carga horaria');

  const repetida = await db.query(`select public.trail_certificado_emitir($1) as c`, [trilha]);
  const { rows: contagem } = await db.query(
    `select count(*)::int as n from public.trail_certificates where profile_id = $1 and trail_id = $2`,
    [ids.prof, trilha]);
  ok(repetida.rows[0]?.c?.codigo === cert?.codigo && contagem[0].n === 1,
    'emissao repetida e idempotente (mesmo codigo, 1 linha)');

  // ---------- RLS ----------
  const leituraPropria = await comoUsuario(ids.prof,
    `select codigo from public.trail_certificates where profile_id = $1`, [ids.prof]);
  ok(leituraPropria.rows.length === 1, 'membro le o proprio certificado');

  const leituraAlheia = await comoUsuario(ids.prof2,
    `select codigo from public.trail_certificates where profile_id = $1`, [ids.prof]);
  ok(leituraAlheia.rows.length === 0, 'membro nao le certificado alheio');

  const leituraAdmin = await comoUsuario(ids.admin, `select codigo from public.trail_certificates`, []);
  ok(leituraAdmin.rows.length === 1, 'admin le todos os certificados');

  const leituraAnon = await comoAnon(`select codigo from public.trail_certificates`, []);
  ok(!!leituraAnon.erro || leituraAnon.rows.length === 0, 'anon nao le a tabela');

  const escritaDireta = await comoUsuario(ids.prof,
    `insert into public.trail_certificates (profile_id, trail_id, codigo, nome, trilha_titulo, nota)
     values ($1, $2, 'LST-AAAAAAAAAA', 'X', 'Y', 100)`,
    [ids.prof, trilhaOpen]);
  ok(!!escritaDireta.erro, 'ninguem insere certificado direto na tabela');

  // ---------- verificacao publica ----------
  const valida = await comoAnon(`select public.trail_certificado_verificar($1) as v`, [cert.codigo]);
  const v = valida.rows[0]?.v;
  ok(!valida.erro && v?.valido === true, 'anon verifica codigo valido');
  ok(v?.nome === 'Prof Pagante' && v?.trilha_titulo === 'Atualizacao NR-1 2026' && v?.nota === 80 && v?.carga_horaria_min === 120,
    'verificacao devolve os campos publicos impressos');
  ok(!('profile_id' in (v ?? {})) && !('trail_id' in (v ?? {})),
    'verificacao nao expoe IDs internos');

  const minuscula = await comoAnon(`select public.trail_certificado_verificar($1) as v`, [cert.codigo.toLowerCase()]);
  ok(minuscula.rows[0]?.v?.valido === true, 'codigo em minusculas tambem verifica');

  const invalida = await comoAnon(`select public.trail_certificado_verificar('LST-0000000000') as v`, []);
  ok(invalida.rows[0]?.v?.valido === false, 'codigo inexistente devolve valido=false');
}

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
