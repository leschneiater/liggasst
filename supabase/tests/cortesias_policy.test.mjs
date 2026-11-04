// Teste local (PGlite) da migracao de cortesias + aba Acessos
// (20261108040000_cortesias.sql, decisoes dela 04/11/2026).
//
// Contrato verificado:
//   - cortesia ativa faz private.plano_da_conta devolver o plano pro do
//     PAPEL da pessoa (profissional->pro_professional, empresa->pro_company)
//     — destaque, Radar, Capacitacao e gate de anuncios seguem juntos;
//   - cortesia vencida ou revogada NAO libera; assinatura paga tem
//     precedencia (plano real, nao o da cortesia);
//   - RLS: cada um le so a propria cortesia; admin le todas; ninguem
//     insere/edita/apaga cortesia direto (so via RPCs admin);
//   - admin_conceder_cortesia / admin_revogar_cortesia: so admin, gravam
//     QUEM e QUANDO; nova cortesia substitui (revoga) a ativa anterior;
//     data fim no passado e rejeitada;
//   - plano_efetivo(): qualquer logado ve o proprio plano efetivo;
//   - admin_listar_acessos(): so admin; traz plano, ultimo acesso, dias
//     ativos 30d e selo cortesia; perfis de teste ficam fora.
//
// Como rodar:  node supabase/tests/cortesias_policy.test.mjs
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

// ---------- shims (mesmos do ads_policy) ----------
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
ok(arquivos.includes('20261108040000_cortesias.sql'),
  `cadeia real aplicada (${arquivos.length} migracoes, incluindo cortesias)`);

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof' });
const empr = await criarUsuario('empr@teste.local', { role: 'company', display_name: 'Empr' });
const proReal = await criarUsuario('proreal@teste.local', { role: 'company', display_name: 'ProReal' });
const admin = await criarUsuario('admin@teste.local', { role: 'professional', display_name: 'Admin' });
const tester = await criarUsuario('qa@teste.local', { role: 'professional', display_name: 'QA' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(`update public.profiles set is_test = true where id = $1`, [tester]);
await db.query(
  `update public.subscriptions set plan = 'pro_company', status = 'active', environment = 'production' where profile_id = $1`,
  [proReal]);

const como = async (uid, sql, params = [], role = 'authenticated') => {
  await db.query('begin');
  await db.query(`set local role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
  let r;
  try { r = await db.query(sql, params); }
  catch (e) { await db.query('rollback'); throw e; }
  await db.query('commit');
  return r;
};
const erra = async (...a) => { try { await como(...a); return false; } catch { return true; } };

// ---------- concessao: so admin ----------
ok(await erra(prof, `select public.admin_conceder_cortesia($1, $2)`, [empr, 'parceria']),
  'usuario comum NAO concede cortesia');

let r = await como(admin, `select public.admin_conceder_cortesia($1, $2, null) as id`, [prof, 'amigo da familia']);
ok(r.rows.length === 1, 'admin concede cortesia (sem prazo)');
const cortesiaProf = r.rows[0].id;

r = await db.query(`select concedida_por = $1 as dono, motivo from public.cortesias where id = $2`, [admin, cortesiaProf]);
ok(r.rows[0].dono === true && r.rows[0].motivo === 'amigo da familia',
  'auditoria: concedida_por e motivo gravados');

ok(await erra(admin, `select public.admin_conceder_cortesia($1, $2, $3)`, [empr, 'x', '2020-01-01']),
  'data fim no passado e rejeitada');

// ---------- regra unica ----------
r = await db.query(`select private.plano_da_conta($1) as p`, [prof]);
ok(r.rows[0].p === 'pro_professional', 'cortesia de profissional vira pro_professional na regra unica');

await como(admin, `select public.admin_conceder_cortesia($1, $2, null)`, [empr, 'parceria comercial']);
r = await db.query(`select private.plano_da_conta($1) as p`, [empr]);
ok(r.rows[0].p === 'pro_company', 'cortesia de empresa vira pro_company na regra unica');

r = await db.query(`select private.plano_da_conta($1) as p`, [proReal]);
ok(r.rows[0].p === 'pro_company', 'assinante real continua com o plano real (precedencia da assinatura)');

r = await db.query(`select count(*)::int as n from public.cortesias where profile_id = $1 and revogada_em is null`, [prof]);
ok(r.rows[0].n === 1, 'uma cortesia ativa por pessoa');

// segunda cortesia substitui a primeira (revoga a antiga)
await como(admin, `select public.admin_conceder_cortesia($1, $2, $3)`, [prof, 'renovacao da cortesia', '2099-12-31']);
r = await db.query(`select count(*)::int as ativas, (select revogada_por = $2 from public.cortesias where id = $3) as aud_ok
                    from public.cortesias where profile_id = $1 and revogada_em is null`, [prof, admin, cortesiaProf]);
ok(r.rows[0].ativas === 1, 'nova cortesia revoga a ativa anterior (segue 1 ativa)');
r = await db.query(`select revogada_por = $1 as ok from public.cortesias where id = $2`, [admin, cortesiaProf]);
ok(r.rows[0].ok === true, 'revogacao da antiga gravou quem revogou');

// ---------- vencimento / revogacao ----------
await db.query(`update public.cortesias set valida_ate = current_date - 1 where profile_id = $1 and revogada_em is null`, [empr]);
r = await db.query(`select private.plano_da_conta($1) as p`, [empr]);
ok(r.rows[0].p === 'free', 'cortesia vencida NAO libera acesso pago');

const cortesiaEmpr = (await db.query(`select id from public.cortesias where profile_id = $1 and revogada_em is null`, [empr])).rows[0].id;
ok(await erra(prof, `select public.admin_revogar_cortesia($1)`, [cortesiaProf]),
  'usuario comum NAO revoga cortesia');
await como(admin, `select public.admin_revogar_cortesia($1)`, [cortesiaEmpr]);
r = await db.query(`select private.plano_da_conta($1) as p`, [empr]);
ok(r.rows[0].p === 'free', 'cortesia revogada NAO libera acesso pago');

// ---------- RLS da tabela ----------
r = await como(prof, `select id from public.cortesias`);
ok(r.rows.length === 2, 'cada um le somente as proprias cortesias (2: a revogada e a ativa)');
r = await como(empr, `select id from public.cortesias`);
ok(r.rows.length === 1, 'terceiro nao ve cortesia dos outros (empr ve so a propria, revogada)');
r = await como(admin, `select id from public.cortesias`);
ok(r.rows.length === 3, 'admin le todas as cortesias (inclusive revogadas)');
ok(await erra(prof, `insert into public.cortesias (profile_id, motivo, concedida_por) values ($1, $2, $3)`, [prof, 'auto', prof]),
  'ninguem insere cortesia direto (so via RPC admin)');
ok(await erra(admin, `update public.cortesias set motivo = 'x'`),
  'nem admin edita cortesia direto (auditoria intacta, so RPC)');

// ---------- plano_efetivo ----------
r = await como(prof, `select public.plano_efetivo() as p`);
ok(r.rows[0].p === 'pro_professional', 'plano_efetivo devolve pro para cortesiado');
r = await como(empr, `select public.plano_efetivo() as p`);
ok(r.rows[0].p === 'free', 'plano_efetivo devolve free sem cortesia ativa');

// ---------- admin_listar_acessos ----------
await como(prof, `insert into public.acesso_diario (user_id, dia) values ($1, current_date)`, [prof]);
await como(prof, `insert into public.acesso_diario (user_id, dia) values ($1, current_date - 40)`, [prof]);
r = await como(empr, `select * from public.admin_listar_acessos()`);
ok(r.rows.length === 0, 'usuario comum NAO lista acessos (0 linhas)');
r = await como(admin, `select profile_id, plano, ultimo_acesso, dias_ativos_30d, cortesia_ativa from public.admin_listar_acessos()`);
const linhaProf = r.rows.find((x) => x.profile_id === prof);
const linhaTeste = r.rows.find((x) => x.profile_id === tester);
ok(!!linhaProf && linhaProf.plano === 'pro_professional' && linhaProf.cortesia_ativa === true,
  'lista mostra plano pro + selo Cortesia para cortesiado');
ok(linhaProf && linhaProf.dias_ativos_30d === 1 && linhaProf.ultimo_acesso !== null,
  'dias ativos 30d conta so o mes recente (1, nao 2) e ultimo acesso preenchido');
ok(!linhaTeste, 'perfis de teste ficam fora da lista');

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
