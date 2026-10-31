// Teste local (PGlite) da migração preparada de avaliações mútuas
// (supabase/migrations/20261031040000_avaliacoes_mutuas.sql). Mesmo
// harness de contratos_policy.test.mjs: cadeia REAL de migrações,
// shims de auth/storage, operações como role authenticated com
// claims de usuários distintos. Não toca em produção.
//
// Decisões verificadas (WhatsApp 31/10/2026):
//   - mútua: empresa e profissional avaliam após contrato CONCLUÍDO;
//   - nota 1-5 + comentário opcional;
//   - leitura aberta a usuários CADASTRADOS (anon não lê);
//   - revelação cega até o par ou o fim do prazo de 14 dias.
// Ponto [DECISÃO] testado conforme o rascunho atual (imutável),
// sujeito a mudança antes da entrega.

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
ok(true, `cadeia real aplicada (${arquivos.length} migracoes)`);
ok(true, 'cadeia de migracoes aplicada (inclui avaliacoes_mutuas)');

// ---------- fixtures ----------
const criarUsuario = async (email, meta) => {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]);
  return rows[0].id;
};
const dona = await criarUsuario('dona@teste.local', { role: 'company', display_name: 'Empresa Dona' });
const outra = await criarUsuario('outra@teste.local', { role: 'company', display_name: 'Empresa Outra' });
const prof = await criarUsuario('prof@teste.local', { role: 'professional', display_name: 'Prof Um' });
const admin = await criarUsuario('admin@teste.local', { role: 'admin', display_name: 'Admin' });
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(`update public.profiles set verification_status = 'approved' where id = any($1::uuid[])`,
  [[dona, outra, prof]]);

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

// Contrato concluído entre dona e prof; outro em andamento; um cancelado.
const contratoDe = async (empresa, profissional) => (await comoUsuario(empresa,
  `insert into public.contracts (company_id, professional_id, demand_id, title, amount)
   values ($1, $2, null, 'Contrato teste', 5000) returning id`, [empresa, profissional])).rows[0].id;

const cConc = await contratoDe(dona, prof);
await comoUsuario(prof, `select public.responder_contrato($1, 'aceitar')`, [cConc]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cConc]);

const cAndam = await contratoDe(dona, prof);
await comoUsuario(prof, `select public.responder_contrato($1, 'aceitar')`, [cAndam]);

const cCanc = await contratoDe(dona, prof);
await comoUsuario(prof, `select public.responder_contrato($1, 'recusar')`, [cCanc]);

// ---------- envio ----------
ok(await esperaErro(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'ok')`, [cAndam]),
  'contrato EM ANDAMENTO nao pode ser avaliado');
ok(await esperaErro(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'ok')`, [cCanc]),
  'contrato CANCELADO nao pode ser avaliado');
ok(await esperaErro(outra, `select public.avaliar_contrato($1::uuid, 5::smallint, 'ok')`, [cConc]),
  'terceiro NAO avalia contrato alheio');
ok(await esperaErro(dona, `select public.avaliar_contrato($1::uuid, 0::smallint, 'ok')`, [cConc]),
  'nota 0 rejeitada');
ok(await esperaErro(dona, `select public.avaliar_contrato($1::uuid, 6::smallint, 'ok')`, [cConc]),
  'nota 6 rejeitada');

const r1 = await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'Otimo trabalho') as id`, [cConc]);
ok(r1.rows.length === 1, 'empresa avalia contrato concluido (5 estrelas + comentario)');
const r2 = await comoUsuario(prof, `select public.avaliar_contrato($1::uuid, 4::smallint, null) as id`, [cConc]);
ok(r2.rows.length === 1, 'profissional avalia de volta (4 estrelas, SEM comentario)');

ok(await esperaErro(dona, `select public.avaliar_contrato($1::uuid, 3::smallint, 'de novo')`, [cConc]),
  'segunda avaliacao do MESMO lado e rejeitada');

// ---------- escrita direta bloqueada ----------
ok(await esperaErro(dona,
  `insert into public.ratings (contract_id, rater_id, rated_id, score) values ($1, $2, $3, 5)`,
  [cConc, dona, prof]),
  'insert direto na tabela e negado (sem grant)');
ok(await esperaErro(dona, `update public.ratings set score = 1 where contract_id = $1`, [cConc]),
  'update DIRETO bloqueado (sem grant; correcao so via RPC)');
ok(await esperaErro(prof, `delete from public.ratings where contract_id = $1`, [cConc]),
  'delete bloqueado (remocao nao aprovada)');

// ---------- leitura (decisão 09:06: aberto a cadastrados) ----------
const leitura = await comoUsuario(outra, `select score from public.ratings where contract_id = $1 order by score`, [cConc]);
ok(leitura.rows.length === 2, 'outro usuario CADASTRADO le as avaliacoes do contrato');
ok(await esperaErro(outra, `select comment from public.ratings limit 1`, []),
  'comentario NAO sai pela leitura direta (regra de ocultacao fica nas RPCs)');
ok(await esperaErro(null, `select count(*) from public.ratings`, [], 'anon'),
  'visitante ANONIMO nao le avaliacoes');

const minhasDona = await comoUsuario(dona, `select direcao, score, contraparte_nome from public.minhas_avaliacoes() order by direcao`);
ok(minhasDona.rows.length === 2
  && minhasDona.rows.some((r) => r.direcao === 'feita' && r.score === 5)
  && minhasDona.rows.some((r) => r.direcao === 'recebida' && r.score === 4),
  'minhas_avaliacoes da empresa: feita (5) e recebida (4)');

const resumoProf = await comoUsuario(outra, `select media, total from public.avaliacoes_resumo($1::uuid)`, [prof]);
ok(Number(resumoProf.rows[0].media) === 5 && Number(resumoProf.rows[0].total) === 1,
  'resumo do profissional: media 5, total 1');
const resumoDona = await comoUsuario(outra, `select media, total from public.avaliacoes_resumo($1::uuid)`, [dona]);
ok(Number(resumoDona.rows[0].media) === 4 && Number(resumoDona.rows[0].total) === 1,
  'resumo da empresa: media 4, total 1');


// ---------- revelação cega (09:08) + prazo 14 dias (09:17, aprovado) ----------
const prof3 = await criarUsuario('prof3@teste.local', { role: 'professional', display_name: 'Prof Tres' });
await db.query(`update public.profiles set verification_status = 'approved' where id = $1`, [prof3]);

// cB: só a empresa avaliou -> cega para todos, inclusive para o avaliado.
const cB = await contratoDe(dona, prof3);
await comoUsuario(prof3, `select public.responder_contrato($1, 'aceitar')`, [cB]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cB]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'Parceria otima')`, [cB]);

ok((await comoUsuario(dona, `select id from public.ratings where contract_id = $1`, [cB])).rows.length === 1,
  'autor ve a propria avaliacao mesmo ainda cega');
ok((await comoUsuario(outra, `select id from public.ratings where contract_id = $1`, [cB])).rows.length === 0,
  'terceiro cadastrado NAO ve avaliacao ainda cega');
ok((await comoUsuario(prof3, `select id from public.minhas_avaliacoes() where contract_id = $1`, [cB])).rows.length === 0,
  'avaliado NAO ve a avaliacao recebida enquanto cega');
{
  const r = await comoUsuario(outra, `select total from public.avaliacoes_resumo($1::uuid)`, [prof3]);
  ok(Number(r.rows[0].total) === 0, 'resumo ignora avaliacao ainda cega (total 0)');
}

// Par completo -> revela na hora para os dois lados e terceiros.
await comoUsuario(prof3, `select public.avaliar_contrato($1::uuid, 4::smallint, null)`, [cB]);
ok((await comoUsuario(outra, `select id from public.ratings where contract_id = $1`, [cB])).rows.length === 2,
  'com os DOIS enviados, terceiro passa a ver as avaliacoes');
{
  const r = await comoUsuario(prof3, `select direcao, score from public.minhas_avaliacoes() where contract_id = $1 order by direcao`, [cB]);
  ok(r.rows.length === 2 && r.rows.some((x) => x.direcao === 'recebida' && x.score === 5),
    'avaliado passa a ver a recebida apos enviar a sua');
}

// cC: prazo encerrado sem par -> revela o que existir; envio tardio rejeitado.
const cC = await contratoDe(dona, prof3);
await comoUsuario(prof3, `select public.responder_contrato($1, 'aceitar')`, [cC]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cC]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 3::smallint, null)`, [cC]);
await db.query(`alter table public.contracts disable trigger all`);
await db.query(`update public.contracts set updated_at = now() - interval '15 days' where id = $1`, [cC]);
await db.query(`alter table public.contracts enable trigger all`);
ok((await comoUsuario(outra, `select id from public.ratings where contract_id = $1`, [cC])).rows.length === 1,
  'fim do prazo revela avaliacao sem par');
ok(await esperaErro(prof3, `select public.avaliar_contrato($1::uuid, 5::smallint, null)`, [cC]),
  'envio apos o fim do prazo e rejeitado');
{
  const r = await comoUsuario(outra, `select media, total from public.avaliacoes_resumo($1::uuid)`, [prof3]);
  ok(Number(r.rows[0].media) === 4 && Number(r.rows[0].total) === 2,
    'resumo do profissional: media 4 (5 e 3), total 2 reveladas');
}

// ---------- correção enquanto oculta (decisão 09:18) ----------
const prof4 = await criarUsuario('prof4@teste.local', { role: 'professional', display_name: 'Prof Quatro' });
await db.query(`update public.profiles set verification_status = 'approved' where id = $1`, [prof4]);

// cD: dona avalia e corrige ANTES do par; par revela; correção passa a falhar.
const cD = await contratoDe(dona, prof4);
await comoUsuario(prof4, `select public.responder_contrato($1, 'aceitar')`, [cD]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cD]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 2::smallint, 'texto inicial')`, [cD]);

ok(await esperaErro(dona, `select public.corrigir_avaliacao($1::uuid, 7::smallint, 'x')`, [cD]),
  'correcao com nota fora de 1-5 rejeitada');
ok(await esperaErro(prof4, `select public.corrigir_avaliacao($1::uuid, 5::smallint, 'x')`, [cD]),
  'corrigir sem ter avaliado e rejeitado');
await comoUsuario(dona, `select public.corrigir_avaliacao($1::uuid, 5::smallint, 'texto corrigido')`, [cD]);
{
  const r = await comoUsuario(dona, `select score, comment from public.minhas_avaliacoes() where contract_id = $1 and direcao = 'feita'`, [cD]);
  ok(r.rows[0].score === 5 && r.rows[0].comment === 'texto corrigido',
    'correcao enquanto oculta altera nota e comentario');
}
await comoUsuario(prof4, `select public.avaliar_contrato($1::uuid, 4::smallint, null)`, [cD]);
ok(await esperaErro(dona, `select public.corrigir_avaliacao($1::uuid, 1::smallint, 'tarde')`, [cD]),
  'correcao APOS revelacao pelo par e rejeitada');
{
  const r = await comoUsuario(dona, `select score, comment from public.minhas_avaliacoes() where contract_id = $1 and direcao = 'feita'`, [cD]);
  ok(r.rows[0].score === 5 && r.rows[0].comment === 'texto corrigido',
    'nota e comentario ficam definitivos apos revelacao');
}

// cE: correção após revelação pelo fim do prazo também falha.
const cE = await contratoDe(dona, prof4);
await comoUsuario(prof4, `select public.responder_contrato($1, 'aceitar')`, [cE]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cE]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 3::smallint, null)`, [cE]);
await db.query(`alter table public.contracts disable trigger all`);
await db.query(`update public.contracts set updated_at = now() - interval '15 days' where id = $1`, [cE]);
await db.query(`alter table public.contracts enable trigger all`);
ok(await esperaErro(dona, `select public.corrigir_avaliacao($1::uuid, 5::smallint, 'tarde')`, [cE]),
  'correcao APOS revelacao pelo fim do prazo e rejeitada');

// ---------- leituras novas (pendentes e vitrine) ----------
{
  const r = await comoUsuario(prof4, `select contract_id from public.avaliacoes_pendentes()`);
  ok(r.rows.length === 0, 'prof4 sem pendencias (avaliou cD; cE fora do prazo)');
}
const cF = await contratoDe(dona, prof4);
await comoUsuario(prof4, `select public.responder_contrato($1, 'aceitar')`, [cF]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cF]);
{
  const r = await comoUsuario(prof4, `select contract_id, contraparte_nome, prazo_fim from public.avaliacoes_pendentes()`);
  ok(r.rows.length === 1 && r.rows[0].contract_id === cF && r.rows[0].contraparte_nome === 'Empresa Dona' && r.rows[0].prazo_fim,
    'avaliacoes_pendentes lista contrato concluido sem avaliacao, com prazo');
}
{
  const r = await comoUsuario(outra, `select score, autor_nome from public.avaliacoes_do_perfil($1::uuid) order by score`, [prof4]);
  ok(r.rows.length === 2 && r.rows.every((x) => x.autor_nome === 'Empresa Dona'),
    'avaliacoes_do_perfil: so reveladas (cD=5 e cE=3), com nome do autor');
}

// ---------- denúncia de avaliações (decisão 09:19) ----------
// cConc tem par revelado (dona 5, prof 4). cB também. cG ficará oculto.
ok(await esperaErro(dona, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'assedio')`,
  [(await comoUsuario(dona, `select id from public.ratings where contract_id = $1 and rater_id = $2`, [cConc, dona])).rows[0].id, dona]),
  'autor NAO denuncia a propria avaliacao');

const ratingProfEmCConc = (await comoUsuario(outra, `select id from public.ratings where contract_id = $1 and rater_id = $2`, [cConc, prof])).rows[0].id;
await comoUsuario(outra, `insert into public.rating_reports (rating_id, reporter_id, reason, details) values ($1, $2, 'conteudo-improprio', 'detalhe')`, [ratingProfEmCConc, outra]);
ok(true, 'cadastrado denuncia avaliacao REVELADA de outro');

ok(await esperaErro(outra, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'outro')`, [ratingProfEmCConc, outra]),
  'denuncia duplicada do mesmo autor e rejeitada');

const cG = await contratoDe(dona, prof4);
await comoUsuario(prof4, `select public.responder_contrato($1, 'aceitar')`, [cG]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cG]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'ainda oculta')`, [cG]);
const ratingOculto = (await comoUsuario(dona, `select id from public.ratings where contract_id = $1`, [cG])).rows[0].id;
ok(await esperaErro(outra, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'spam')`, [ratingOculto, outra]),
  'avaliacao ainda OCULTA nao pode ser denunciada');

ok((await comoUsuario(outra, `select id from public.rating_reports where reporter_id = $1`, [outra])).rows.length === 1,
  'autor le a propria denuncia');
ok((await comoUsuario(prof, `select id from public.rating_reports`, [])).rows.length === 0,
  'terceiro NAO le denuncia alheia');
const denunciasAdmin = await comoUsuario(admin, `select id, status from public.rating_reports`, []);
ok(denunciasAdmin.rows.length === 1 && denunciasAdmin.rows[0].status === 'open',
  'admin le todas as denuncias');
ok(await esperaErro(outra, `update public.rating_reports set status = 'actioned' where reporter_id = $1`, [outra]),
  'nao-admin NAO atualiza status de denuncia (sem grant de update)');
ok((await comoUsuario(admin, `select status from public.rating_reports where reporter_id = $1`, [outra])).rows[0].status === 'open',
  'denuncia segue aberta ate a admin revisar (revisao via RPC, testada adiante)');

// ---------- moderação do comentário (decisão 09:20) ----------
// cH: par revelado; dona deu 5 COM comentário; prof4 recebeu.
const cH = await contratoDe(dona, prof4);
await comoUsuario(prof4, `select public.responder_contrato($1, 'aceitar')`, [cH]);
await comoUsuario(dona, `select public.concluir_contrato($1)`, [cH]);
await comoUsuario(dona, `select public.avaliar_contrato($1::uuid, 5::smallint, 'Comentario publico')`, [cH]);
await comoUsuario(prof4, `select public.avaliar_contrato($1::uuid, 4::smallint, null)`, [cH]);

{
  const r = await comoUsuario(outra, `select score, comment from public.avaliacoes_do_perfil($1::uuid)`, [prof4]);
  const deD = r.rows.find((x) => x.score === 5);
  ok(deD && deD.comment === 'Comentario publico', 'antes da denuncia, comentario aparece na vitrine');
}
const ratingCH = (await comoUsuario(dona, `select id from public.ratings where contract_id = $1`, [cH])).rows[0].id;
await comoUsuario(outra, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'conteudo-improprio')`, [ratingCH, outra]);
{
  const r = await comoUsuario(outra, `select score, comment from public.avaliacoes_do_perfil($1::uuid)`, [prof4]);
  const deD = r.rows.find((x) => x.score === 5);
  ok(deD && deD.comment === null, 'com denuncia EM ABERTO, comentario some da vitrine');
}
{
  const r = await comoUsuario(outra, `select total from public.avaliacoes_resumo($1::uuid)`, [prof4]);
  ok(Number(r.rows[0].total) === 3, 'NOTA segue visivel e contando na media durante a revisao');
}
{
  const r = await comoUsuario(dona, `select comment, comentario_oculto from public.minhas_avaliacoes() where contract_id = $1 and direcao = 'feita'`, [cH]);
  ok(r.rows[0].comment === 'Comentario publico' && r.rows[0].comentario_oculto === true,
    'autora ainda ve o proprio comentario, com flag de oculto');
}

ok(await esperaErro(outra, `select public.admin_revisar_denuncia_avaliacao($1::uuid, 'manter')`, [ratingCH]),
  'nao-admin NAO revisa denuncia');
const reportCH = (await comoUsuario(admin, `select report_id from public.admin_denuncias_avaliacoes() where rating_id = $1`, [ratingCH])).rows[0].report_id;
await comoUsuario(admin, `select public.admin_revisar_denuncia_avaliacao($1::uuid, 'manter')`, [reportCH]);
{
  const r = await comoUsuario(outra, `select score, comment from public.avaliacoes_do_perfil($1::uuid)`, [prof4]);
  ok(r.rows.find((x) => x.score === 5).comment === 'Comentario publico',
    'admin MANTEM: comentario volta a aparecer');
}
ok(await esperaErro(admin, `select public.admin_revisar_denuncia_avaliacao($1::uuid, 'manter')`, [reportCH]),
  'denuncia ja revisada nao pode ser revisada de novo');

// outra ja denunciou esta avaliacao (unique por autor); segundo autor denuncia.
const outra2 = await criarUsuario('outra2@teste.local', { role: 'company', display_name: 'Empresa Outra 2' });
await db.query(`update public.profiles set verification_status = 'approved' where id = $1`, [outra2]);
await comoUsuario(prof4, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'assedio')`, [ratingCH, prof4]);
await comoUsuario(outra2, `insert into public.rating_reports (rating_id, reporter_id, reason) values ($1, $2, 'outro')`, [ratingCH, outra2]);
const reportCH2 = (await comoUsuario(admin, `select report_id from public.admin_denuncias_avaliacoes() where rating_id = $1 and status = 'open' limit 1`, [ratingCH])).rows[0].report_id;
await comoUsuario(admin, `select public.admin_revisar_denuncia_avaliacao($1::uuid, 'excluir-comentario')`, [reportCH2]);
{
  const r = await comoUsuario(outra, `select score, comment from public.avaliacoes_do_perfil($1::uuid)`, [prof4]);
  ok(r.rows.find((x) => x.score === 5).comment === null,
    'admin EXCLUI comentario: some da vitrine de vez');
}
{
  const r = await comoUsuario(admin, `select status from public.rating_reports where rating_id = $1 order by status`, [ratingCH]);
  ok(r.rows.every((x) => x.status !== 'open') && r.rows.filter((x) => x.status === 'actioned').length === 2,
    'exclusao fecha TODAS as denuncias abertas da avaliacao como actioned');
}
{
  const r = await comoUsuario(admin, `select comment, comment_removed_at from public.admin_denuncias_avaliacoes() where rating_id = $1 limit 1`, [ratingCH]);
  ok(r.rows[0].comment === 'Comentario publico' && r.rows[0].comment_removed_at !== null,
    'registro preservado para auditoria: texto retido, marcado como removido');
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
