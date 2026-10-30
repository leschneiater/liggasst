// Teste de autorizacao local (RLS/grants/policies) dos certificados compartilhados.
// Roda um Postgres real (PGlite, WASM) com o MESMO schema/RLS/grants da migration
// 20260903190000_unify_supabase.sql e aplica os drafts desta pasta. Cada chamada
// "como(uid, sql)" executa como role authenticated com app.uid fixo e faz rollback —
// o que se testa e a DECISAO de autorizacao (permitir/negar), nao o estado final.
// Uma excecao verifica o efeito do delete dentro de uma unica transacao.
//
// Como rodar (nesta pasta):
//   npm install
//   node certificados-rls.test.mjs
// Saida esperada: "==== 21 PASS, 0 FAIL ====" (exit code 0).
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DRAFTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const db = await PGlite.create();
const q = (sql, params) => db.query(sql, params);
let pass = 0, fail = 0;
const check = (nome, cond, detalhe = '') => {
  if (cond) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome} ${detalhe}`); }
};

// ---------- shim do ambiente Supabase ----------
await q(`create role authenticated nologin`);
await q(`create role anon nologin`);
await q(`create schema auth`);
await q(`create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid $$`);
await q(`create schema private`);
await q(`create table public.profiles (
  id uuid primary key,
  role text not null default 'professional' check (role in ('professional','company','admin')),
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  is_test boolean not null default false,
  display_name text
)`);
await q(`create table public.professionals (profile_id uuid primary key references public.profiles(id))`);
await q(`create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(profile_id) on delete cascade,
  name text not null, issuer text, issued_at date, expires_at date,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
)`);
await q(`create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') $$`);

// ---------- RLS + grants identicos a 20260903190000 ----------
await q(`alter table public.certificates enable row level security`);
await q(`revoke all on public.certificates from anon, authenticated`);
await q(`grant select on public.certificates to authenticated`);
await q(`grant insert on public.certificates to authenticated`);
await q(`grant update (name, issuer, issued_at, expires_at, storage_path) on public.certificates to authenticated`);
await q(`grant usage on schema public to authenticated`);
await q(`create policy certificates_select on public.certificates for select to authenticated
  using (professional_id = (select auth.uid()) or (select private.is_admin()))`);
await q(`create policy certificates_insert on public.certificates for insert to authenticated
  with check (professional_id = (select auth.uid()) and status = 'pending')`);
await q(`create policy certificates_update on public.certificates for update to authenticated
  using (professional_id = (select auth.uid()) or (select private.is_admin()))
  with check (professional_id = (select auth.uid()) or (select private.is_admin()))`);

// ---------- migration em rascunho (compartilhamento) ----------
await db.exec(fs.readFileSync(path.join(DRAFTS, 'draft_certificados_compartilhamento.sql'), 'utf8'));

// ---------- fixtures ----------
const A = 'aaaaaaaa-0000-0000-0000-00000000000a'; // profissional aprovado
const B = 'bbbbbbbb-0000-0000-0000-00000000000b'; // profissional pendente
const C = 'cccccccc-0000-0000-0000-00000000000c'; // empresa aprovada
const D = 'dddddddd-0000-0000-0000-00000000000d'; // empresa pendente
const E = 'eeeeeeee-0000-0000-0000-00000000000e'; // empresa rejeitada
await q(`insert into public.profiles (id, role, verification_status, display_name) values
  ($1,'professional','approved','Prof A'),($2,'professional','pending','Prof B'),
  ($3,'company','approved','Emp C'),($4,'company','pending','Emp D'),($5,'company','rejected','Emp E')`,
  [A,B,C,D,E]);
await q(`insert into public.professionals (profile_id) values ($1),($2)`, [A,B]);
// certificados: A tem 1 compartilhado + 1 privado (default); B tem 1 compartilhado
await q(`insert into public.certificates (professional_id, name, storage_path, visible_to_companies) values
  ($1, 'Cert A compartilhado', $2, true),
  ($1, 'Cert A privado', $3, false),
  ($4, 'Cert B compartilhado', $5, true)`,
  [A, `${A}/certificados/a1.pdf`, `${A}/certificados/a2.pdf`, B, `${B}/certificados/b1.pdf`]);

// helper: executa como role authenticated com uid fixo
const como = async (uid, sql, params) => {
  await q(`begin`);
  await q(`set local role authenticated`);
  await q(`select set_config('app.uid', $1, true)`, [uid]);
  try {
    const r = await q(sql, params);
    await q(`rollback`);
    return { rows: r.rows };
  } catch (e) {
    await q(`rollback`);
    return { error: e.message };
  }
};

// ---------- 1. RPC: visibilidade ----------
let r = await como(C, `select * from public.get_professional_shared_certificates($1)`, [A]);
check('RPC empresa aprovada ve so compartilhados de A', r.rows?.length === 1 && r.rows[0].name === 'Cert A compartilhado', JSON.stringify(r));
r = await como(C, `select * from public.get_professional_shared_certificates($1)`, [B]);
check('RPC empresa aprovada NAO ve cert de profissional pendente', r.rows?.length === 0, JSON.stringify(r));
r = await como(D, `select * from public.get_professional_shared_certificates($1)`, [A]);
check('RPC empresa PENDENTE nao ve nada', r.rows?.length === 0, JSON.stringify(r));
r = await como(E, `select * from public.get_professional_shared_certificates($1)`, [A]);
check('RPC empresa REJEITADA nao ve nada', r.rows?.length === 0, JSON.stringify(r));
r = await como(A, `select * from public.get_professional_shared_certificates($1)`, [A]);
check('RPC profissional (mesmo dono) nao usa o RPC', r.rows?.length === 0, JSON.stringify(r));
r = await como(C, `select storage_path from public.get_professional_shared_certificates($1)`, [A]);
check('RPC nao expoe storage_path', !!r.error, JSON.stringify(r));

// ---------- 2. insert ----------
r = await como(A, `insert into public.certificates (professional_id, name, storage_path) values ($1,'novo',$2) returning id, status, visible_to_companies`, [A, `${A}/certificados/n.pdf`]);
check('insert proprio pending ok, flag default false', r.rows?.[0]?.status === 'pending' && r.rows?.[0]?.visible_to_companies === false, JSON.stringify(r));
r = await como(A, `insert into public.certificates (professional_id, name, storage_path, status) values ($1,'x',$2,'approved')`, [A, `${A}/x.pdf`]);
check('insert com status approved BLOQUEADO pela policy', /row-level security/i.test(r.error ?? ''), r.error);
r = await como(A, `insert into public.certificates (professional_id, name, storage_path) values ($1,'x',$2)`, [B, `${A}/x.pdf`]);
check('insert em nome de outro profissional BLOQUEADO', /row-level security/i.test(r.error ?? ''), r.error);

// ---------- 3. update ----------
const certA = (await q(`select id from public.certificates where name='Cert A privado'`)).rows[0].id;
r = await como(A, `update public.certificates set visible_to_companies = true where id = $1 returning id`, [certA]);
check('dono liga visibilidade no proprio cert', r.rows?.length === 1, JSON.stringify(r));
r = await como(A, `update public.certificates set status = 'approved' where id = $1`, [certA]);
check('dono NAO muda status (grant de coluna)', /permission denied/i.test(r.error ?? ''), r.error);
r = await como(A, `update public.certificates set professional_id = $1 where id = $2`, [B, certA]);
check('dono NAO muda professional_id (grant de coluna)', /permission denied/i.test(r.error ?? ''), r.error);
r = await como(B, `update public.certificates set visible_to_companies = true where id = $1 returning id`, [certA]);
check('outro profissional NAO altera visibilidade de cert alheio', r.rows?.length === 0, JSON.stringify(r));
r = await como(A, `update public.certificates set storage_path = $1 where id = $2 returning id`, [`${B}/certificados/b1.pdf`, certA]);
const swapPermitido = r.rows?.length === 1;
console.log(`INFO  update storage_path para pasta alheia ${swapPermitido ? 'PERMITIDO pelo grant atual (mitigado pela Edge Function + revoke draft)' : 'bloqueado'}`);
r = await como(C, `update public.certificates set visible_to_companies = false where id = $1 returning id`, [certA]);
check('empresa NAO altera certificado de profissional', r.rows?.length === 0, JSON.stringify(r));

// ---------- 4. delete ----------
r = await como(A, `delete from public.certificates where id = $1`, [certA]);
check('delete BLOQUEADO hoje (sem policy+grant) — draft necessario', /row-level security|permission denied/i.test(r.error ?? ''), r.error);

// com o draft aplicado (policy + grant delete necessario):
await db.exec(fs.readFileSync(path.join(DRAFTS, 'draft_certificados_delete.sql'), 'utf8'));
r = await como(B, `delete from public.certificates where id = $1 and professional_id = $2 returning id`, [certA, B]);
check('delete com dono errado no filtro: 0 linhas (frontend trata como erro, NAO toca storage)', r.rows?.length === 0, JSON.stringify(r));
// efeito real verificado dentro de UMA transacao (delete + conferencia atomicos)
await q(`begin`);
await q(`set local role authenticated`);
await q(`select set_config('app.uid', $1, true)`, [A]);
let rDel = await q(`delete from public.certificates where id = $1 and professional_id = $2 returning id`, [certA, A]);
let rCnt = await q(`select count(*)::int as n from public.certificates where id = $1`, [certA]);
await q(`rollback`);
check('dono exclui proprio cert com policy draft: 1 linha e linha some na mesma transacao', rDel.rows?.length === 1 && rCnt.rows[0].n === 0, JSON.stringify({ del: rDel.rows, cnt: rCnt.rows }));

// ---------- 5. draft revoke storage_path ----------
await db.exec(fs.readFileSync(path.join(DRAFTS, 'draft_certificados_revoke_storage_path.sql'), 'utf8'));
r = await como(A, `update public.certificates set storage_path = $1 where id = $2`, [`${B}/x.pdf`, certA]);
check('apos revoke: update storage_path vira permission denied', /permission denied/i.test(r.error ?? ''), r.error);
r = await como(A, `update public.certificates set visible_to_companies = false where id = $1 returning id`, [certA]);
check('apos revoke: toggle de visibilidade continua funcionando', r.rows?.length === 1, JSON.stringify(r));

// ---------- 6. prefix check da Edge Function (logica equivalente) ----------
const certB = (await q(`select id from public.certificates where name='Cert B compartilhado'`)).rows[0].id;
r = await q(`select storage_path, professional_id, storage_path like professional_id::text || '/%' as prefixo_ok from public.certificates where id = $1`, [certB]);
check('prefixo storage_path pertence ao dono (funcao aceitaria)', r.rows[0].prefixo_ok === true, JSON.stringify(r.rows));
await q(`update public.certificates set storage_path = $1 where id = $2`, [`${A}/roubado.pdf`, certB]); // como superuser, simulando adulteracao
r = await q(`select storage_path like professional_id::text || '/%' as prefixo_ok from public.certificates where id = $1`, [certB]);
check('storage_path adulterado FALHA no prefixo (funcao recusaria 404)', r.rows[0].prefixo_ok === false, JSON.stringify(r.rows));

console.log(`\n==== ${pass} PASS, ${fail} FAIL ====`);
await db.close();
process.exit(fail ? 1 : 0);
