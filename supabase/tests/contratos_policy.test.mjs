// Teste local (PGlite) do fluxo de contratos (20261031010000_contratos_fluxo.sql).
//
// Mesmo harness de demands_policy.test.mjs: cadeia REAL de migracoes sobre
// Postgres embarcado, shims de auth/storage, e operacoes como role
// authenticated com claims de JWT de usuarios distintos (avaliacao de policy
// igual a do PostgREST). Nao toca em producao.
//
// Contrato verificado:
//   - insert: empresa aprovada propoe (com ou sem demanda ativa propria);
//     profissional, outra empresa, status fora de pending, demanda alheia,
//     demanda encerrada, profissional nao aprovado e empresa nao aprovada
//     sao todos rejeitados pela policy contracts_insert;
//   - leitura: terceiro nao ve contrato alheio; admin ve; listar_contratos
//     so devolve as tratativas do chamador, com nome da contraparte;
//   - sem grant de UPDATE: update direto e negado para as partes;
//   - responder_contrato: so o profissional contratado responde, e so uma
//     vez; no aceite, a demanda vai a in_progress NA MESMA TRANSACAO e
//     propostas pendentes concorrentes para a mesma demanda sao canceladas;
//     aceitar com demanda ja inativa falha por conflito e nada muda;
//     recusa nao toca na demanda;
//   - cancelar_contrato: partes cancelam pending/in_progress; ao cancelar
//     em andamento, a demanda vinculada volta a vitrine (active);
//   - concluir_contrato: so a empresa conclui, so em andamento; a demanda
//     vinculada e concluida JUNTO na mesma transacao (decisao de produto
//     aprovada pela usuaria); se a empresa ja a encerrou antes, nada e
//     reaberto nem sobrescrito;
//   - trigger contrato_guarda_transicao: encerrado e imutavel (inclusive
//     admin), partes/demanda imutaveis, transicoes invalidas rejeitadas;
//   - guarda de demandas: active->in_progress fora do fluxo de contrato
//     segue invalida (a flag app.fluxo_contrato e por transacao).
//
// Como rodar:  npm run test:contracts

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
ok(true, `cadeia real aplicada (${arquivos.length} migracoes)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const dona = await criarUsuario('dona@teste.local', { role: 'company', display_name: 'Empresa Dona' });
const outra = await criarUsuario('outra@teste.local', { role: 'company', display_name: 'Empresa Outra' });
const empresaPendente = await criarUsuario('pendente@teste.local', { role: 'company', display_name: 'Empresa Pendente' });
const prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Um' });
const prof2 = await criarUsuario('prof2@teste.local', { role: 'professional', display_name: 'Prof Dois' });
const profPendente = await criarUsuario('profp@teste.local', { role: 'professional', display_name: 'Prof Pendente' });
const admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(`update public.profiles set verification_status = 'pending' where id = any($1::uuid[])`,
  [[empresaPendente, profPendente]]);
await db.query(
  `update public.profiles set verification_status = 'approved' where id = any($1::uuid[])`,
  [[dona, outra, prof, prof2]]);

// Executa como role/claims especificos (mesma avaliacao do PostgREST).
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
const linhasAfetadas = (r) => r.affectedRows ?? r.rowCount ?? 0;

// ---------- insert: policy contracts_insert ----------
const novaDemanda = async (titulo) => {
  const r = await comoUsuario(dona,
    `insert into public.demands (company_id, title, description, status) values ($1, $2, 'desc', 'active') returning id`,
    [dona, titulo]);
  return r.rows[0].id;
};

const demA = await novaDemanda('PGR matriz');
const propoe = (empresa, profissional, demanda, extras = '') => comoUsuario(empresa,
  `insert into public.contracts (company_id, professional_id, demand_id, title, amount ${extras ? ',' + extras : ''})
   values ($1, $2, $3, 'Contrato teste', 5000) returning id, status, progress`,
  [empresa, profissional, demanda]);

const insOk = await propoe(dona, prof, demA);
ok(insOk.rows.length === 1 && insOk.rows[0].status === 'pending',
  'empresa aprovada propoe contrato vinculado a demanda ativa propria');
const contratoA = insOk.rows[0].id;

const insSemDemanda = await propoe(dona, prof2, null);
ok(insSemDemanda.rows.length === 1, 'proposta sem demanda (avulsa, com titulo) e aceita');
const contratoAvulso = insSemDemanda.rows[0].id;

ok(await esperaErro(prof, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, null)`, [dona, prof2]),
  'profissional NAO insere contrato (policy exige empresa aprovada)');

ok(await esperaErro(outra, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, null)`, [dona, prof]),
  'empresa NAO insere contrato com company_id de outra');

ok(await esperaErro(dona, `insert into public.contracts (company_id, professional_id, demand_id, status)
  values ($1, $2, null, 'in_progress')`, [dona, prof]),
  'insert com status fora de pending e rejeitado');

const demOutra = (await comoUsuario(outra,
  `insert into public.demands (company_id, title, description, status) values ($1, 'Alheia', 'desc', 'active') returning id`,
  [outra])).rows[0].id;
ok(await esperaErro(dona, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, $3)`, [dona, prof, demOutra]),
  'proposta vinculada a demanda de OUTRA empresa e rejeitada');

const demEncerrada = await novaDemanda('Encerrada');
await comoUsuario(dona, `update public.demands set status = 'completed' where id = $1`, [demEncerrada]);
ok(await esperaErro(dona, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, $3)`, [dona, prof, demEncerrada]),
  'proposta vinculada a demanda ja encerrada e rejeitada');

ok(await esperaErro(dona, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, null)`, [dona, profPendente]),
  'proposta para profissional NAO aprovado e rejeitada');

ok(await esperaErro(empresaPendente, `insert into public.contracts (company_id, professional_id, demand_id)
  values ($1, $2, null)`, [empresaPendente, prof]),
  'empresa NAO aprovada nao propoe contrato');

// ---------- leitura ----------
const selTerceiro = await comoUsuario(prof2,
  `select id from public.contracts where id = $1`, [contratoA]);
ok(selTerceiro.rows.length === 0, 'terceiro NAO le contrato alheio (RLS select)');
const selAdmin = await comoUsuario(admin,
  `select id from public.contracts where id = $1`, [contratoA]);
ok(selAdmin.rows.length === 1, 'admin le contrato (suporte/auditoria)');

// ---------- sem grant de update ----------
ok(await esperaErro(dona, `update public.contracts set status = 'completed' where id = $1`, [contratoA]),
  'update direto e NEGADO (sem grant; transicoes so via RPC)');

// ---------- responder_contrato: papeis e unicidade ----------
ok(await esperaErro(dona, `select public.responder_contrato($1, 'aceitar')`, [contratoA]),
  'empresa NAO responde a propria proposta');
ok(await esperaErro(prof2, `select public.responder_contrato($1, 'aceitar')`, [contratoA]),
  'outro profissional NAO responde proposta alheia');
ok(await esperaErro(prof, `select public.responder_contrato($1, 'adiar')`, [contratoA]),
  'acao invalida e rejeitada');

// Recusa da proposta avulsa: demanda nao existe, nada acontece com demandas.
await comoUsuario(prof2, `select public.responder_contrato($1, 'recusar')`, [contratoAvulso]);
const recusado = (await db.query(`select status from public.contracts where id = $1`, [contratoAvulso])).rows[0];
ok(recusado.status === 'cancelled', 'recusa encerra a proposta como cancelada');
ok(await esperaErro(prof2, `select public.responder_contrato($1, 'aceitar')`, [contratoAvulso]),
  'proposta ja respondida NAO pode ser respondida de novo');

// ---------- concorrencia: duas propostas pendentes para a mesma demanda ----------
const demB = await novaDemanda('Laudo ergonomico');
const cB1 = (await propoe(dona, prof, demB)).rows[0].id;
const cB2 = (await propoe(dona, prof2, demB)).rows[0].id;
await comoUsuario(prof, `select public.responder_contrato($1, 'aceitar')`, [cB1]);
const demBApos = (await db.query(`select status from public.demands where id = $1`, [demB])).rows[0];
ok(demBApos.status === 'in_progress', 'aceite leva a demanda a in_progress (sai da vitrine)');
const cB2Apos = (await db.query(`select status from public.contracts where id = $1`, [cB2])).rows[0];
ok(cB2Apos.status === 'cancelled', 'proposta concorrente pendente e cancelada automaticamente no aceite');
ok(await esperaErro(prof2, `select public.responder_contrato($1, 'aceitar')`, [cB2]),
  'segundo aceite na mesma demanda falha (proposta ja cancelada)');
const demBFim = (await db.query(`select status from public.demands where id = $1`, [demB])).rows[0];
ok(demBFim.status === 'in_progress', 'demanda NAO foi sobrescrita pelo segundo aceite');

// ---------- aceite sobre demanda ja encerrada pela empresa ----------
const demC = await novaDemanda('Treinamento NR-35');
const cC = (await propoe(dona, prof, demC)).rows[0].id;
await comoUsuario(dona, `update public.demands set status = 'completed' where id = $1`, [demC]);
ok(await esperaErro(prof, `select public.responder_contrato($1, 'aceitar')`, [cC]),
  'aceitar proposta de demanda ja encerrada falha por conflito');
const cCApos = (await db.query(`select status from public.contracts where id = $1`, [cC])).rows[0];
const demCApos = (await db.query(`select status from public.demands where id = $1`, [demC])).rows[0];
ok(cCApos.status === 'pending' && demCApos.status === 'completed',
  'conflito nao muda nada: proposta segue pendente e demanda segue encerrada');

// ---------- cancelar: devolve a demanda a vitrine ----------
ok(await esperaErro(prof2, `select public.cancelar_contrato($1)`, [cB1]),
  'terceiro NAO cancela contrato alheio');
await comoUsuario(prof, `select public.cancelar_contrato($1)`, [cB1]);
const demBReaberta = (await db.query(`select status from public.demands where id = $1`, [demB])).rows[0];
ok(demBReaberta.status === 'active', 'cancelar contrato em andamento devolve a demanda a vitrine');
const cB1Apos = (await db.query(`select status from public.contracts where id = $1`, [cB1])).rows[0];
ok(cB1Apos.status === 'cancelled', 'contrato cancelado fica no historico');

// Cancelar proposta pendente de demanda ja encerrada: volta-para-active nao reabre encerrada.
await comoUsuario(dona, `select public.cancelar_contrato($1)`, [cC]);
const demCFim = (await db.query(`select status from public.demands where id = $1`, [demC])).rows[0];
ok(demCFim.status === 'completed', 'cancelar proposta pendente NAO reabre demanda encerrada');

// ---------- concluir: empresa, em andamento, sem tocar na demanda ----------
ok(await esperaErro(prof, `select public.concluir_contrato($1)`, [contratoA]),
  'profissional NAO conclui contrato (so a empresa)');
await comoUsuario(prof, `select public.responder_contrato($1, 'aceitar')`, [contratoA]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [contratoA]);
const concluido = (await db.query(`select status, progress from public.contracts where id = $1`, [contratoA])).rows[0];
ok(concluido.status === 'completed' && concluido.progress === 100, 'empresa conclui contrato em andamento');
const demAApos = (await db.query(`select status from public.demands where id = $1`, [demA])).rows[0];
ok(demAApos.status === 'completed', 'concluir contrato conclui a demanda vinculada na mesma transacao');
ok(await esperaErro(dona, `select public.concluir_contrato($1)`, [contratoA]),
  'contrato ja concluido nao pode ser concluido de novo');

// Empresa encerrou a demanda antes de concluir o contrato: concluir segue
// funcionando e NAO reabre nem sobrescreve a demanda.
const demD = await novaDemanda('Inspecao de caldeiras');
const cD = (await propoe(dona, prof, demD)).rows[0].id;
await comoUsuario(prof, `select public.responder_contrato($1, 'aceitar')`, [cD]);
await comoUsuario(dona, `update public.demands set status = 'completed' where id = $1`, [demD]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cD]);
const cDApos = (await db.query(`select status from public.contracts where id = $1`, [cD])).rows[0];
const demDApos = (await db.query(`select status from public.demands where id = $1`, [demD])).rows[0];
ok(cDApos.status === 'completed' && demDApos.status === 'completed',
  'concluir com demanda ja encerrada funciona e nao sobrescreve nada');

// ---------- trigger: historico e partes imutaveis ----------
ok(await esperaErro(null, `update public.contracts set status = 'in_progress' where id = $1`, [contratoA], 'anon')
  , 'contrato encerrado e imutavel (reabrir bloqueado)');
let erroAdmin = null;
try {
  await db.query(`update public.contracts set title = 'reescrever' where id = $1`, [contratoA]);
} catch (e) { erroAdmin = e; }
ok(erroAdmin !== null, 'contrato encerrado e imutavel ate para admin (trigger)');
let erroPartes = null;
try {
  await db.query(`update public.contracts set professional_id = $1 where id = $2`, [prof2, demB ? cB1 : cB1]);
} catch (e) { erroPartes = e; }
ok(erroPartes !== null, 'partes do contrato nao podem ser trocadas (trigger)');
let erroTransicao = null;
try {
  const c = (await propoe(dona, prof, null)).rows[0].id;
  await db.query(`update public.contracts set status = 'completed' where id = $1`, [c]);
} catch (e) { erroTransicao = e; }
ok(erroTransicao !== null, 'transicao invalida pending->completed rejeitada (trigger)');

// ---------- flag app.fluxo_contrato: falsificacao nao escala privilegio ----------
// Clientes da API so chamam RPCs do schema public; set_config e de
// pg_catalog e nao e exposta. Mesmo num cenario hipotetico com SQL livre,
// a flag so abre a transicao na guarda - a policy demands_update segue
// limitando o efeito a demanda do proprio dono.
{
  await db.query('begin');
  await db.query('set local role authenticated');
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: prof })]);
  await db.query(`select set_config('app.fluxo_contrato', '1', true)`);
  const r = await db.query(`update public.demands set status = 'in_progress' where id = $1`, [demB]);
  await db.query('commit');
  ok(linhasAfetadas(r) === 0, 'flag falsificada por terceiro NAO move demanda alheia (policy demands_update)');
}

// ---------- guarda de demandas fora do fluxo de contrato ----------
ok(await esperaErro(dona, `update public.demands set status = 'in_progress' where id = $1`, [demB]),
  'active->in_progress direto (fora do fluxo de contrato) segue INVALIDO');
const demBEdit = await comoUsuario(dona,
  `update public.demands set title = 'Laudo ergonomico v2' where id = $1`, [demB]);
ok(linhasAfetadas(demBEdit) === 1, 'editar demanda ativa segue funcionando');

// ---------- listar_contratos: escopo e nomes ----------
const listaProf = await comoUsuario(prof, `select * from public.listar_contratos()`);
ok(listaProf.rows.length > 0
  && listaProf.rows.every((r) => r.company_id === prof || r.professional_id === prof),
  'listar_contratos do profissional so devolve as proprias tratativas');
const linhaProf = listaProf.rows.find((r) => r.id === contratoA);
ok(linhaProf && linhaProf.contraparte_nome === 'Empresa Dona' && linhaProf.demanda_titulo === 'PGR matriz',
  'listar_contratos traz nome da contraparte e titulo da demanda');
const listaDona = await comoUsuario(dona, `select * from public.listar_contratos()`);
ok(listaDona.rows.length > 0
  && listaDona.rows.every((r) => r.company_id === dona),
  'listar_contratos da empresa so devolve os proprios contratos');
const listaAdmin = await comoUsuario(admin, `select * from public.listar_contratos()`);
ok(listaAdmin.rows.length === 0, 'listar_contratos de admin (sem contratos) devolve vazio');

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
