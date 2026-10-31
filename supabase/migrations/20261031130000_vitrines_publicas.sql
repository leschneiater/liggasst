-- ============================================================
-- VITRINES PUBLICAS RESUMIDAS — preparo local, NAO aplicado em
-- producao. Decisao de produto da Leticia (WhatsApp 31/10/2026,
-- "Vamos seguir assim", repassada pelo Instinct):
--  - vitrine publica de profissionais: campos resumidos, SEM
--    contato; conversa e contrato so dentro da plataforma, apos
--    login;
--  - vitrine publica de empresas: resumo, SEM contato e SEM
--    necessidades; listar uma empresa NAO pode sugerir que ela
--    esta contratando (vitrine != demanda ativa);
--  - dados de demandas nunca entram no recorte anonimo.
--
-- O que esta migracao faz (estado final desejado):
--  1) search_companies_public: RPC NOVA da vitrine de empresas
--     (anon + authenticated). Campos: id, display_name, city,
--     state, segment, employee_count, description. SEM needs,
--     SEM email/telefone/cnpj, SEM dados de demandas. is_test
--     sempre fora (visitante anonimo nao esta no gate de teste).
--  2) search_professionals / get_professional_public: redefinidas
--     como vitrine ANONIMA (anon + authenticated). O corpo nao
--     muda — os campos expostos sao os mesmos ja publicos hoje —
--     e NAO inclui linkedin_url (audiencia do LinkedIn e decisao
--     pendente; ver CONTRATO DE MERGE abaixo).
--  3) Funcoes de area logada: revoke de public/anon, grant apenas
--     authenticated. Hoje o catalogo de producao diverge do repo
--     e deixa TODAS executaveis por anon (constatado em auditoria
--     31/10); esta migracao reafirma o escopo pretendido.
--  4) ratings: revoke SELECT de public/anon (leitura publica de
--     avaliacoes segue via avaliacoes_resumo/avaliacoes_do_perfil).
--
-- CONTRATO DE MERGE com o pacote OAuth/completar-cadastro
-- (20261031120200): aquele pacote DROP/recria
-- search_profissionals(text,text,text) e get_professional_public(uuid)
-- incluindo linkedin_url e grant apenas authenticated. Na fusao final:
--  - a versao final dessas duas funcoes NAO pode conter linkedin_url
--    ate decisao explicita da Leticia, e precisa grant anon +
--    authenticated (senao a vitrine anonima quebra);
--  - a exibicao de LinkedIn na area logada deve ler de uma funcao
--    autenticada dedicada do pacote OAuth;
--  - esta migracao deve ser a ultima a definir as duas funcoes OU
--    o arquivo OAuth deve ser alinhado — a ordem sozinha nao
--    garante o resultado. Reconciliar os dois pacotes e confirmar
--    o escopo antes de aplicar (exigencia do coordenador, 31/10).
--
-- Pendencias de produto preservadas (NAO decididas aqui):
--  - hourly_rate e availability seguem no payload da vitrine de
--    profissionais (ja sao publicos hoje). Remocao futura = tirar
--    2 linhas de cada funcao + ajuste da interface.
--  - LinkedIn: fora do anon ate decisao explicita.
--  - Necessidades/demandas da empresa: fora da vitrine ate decisao
--    explicita. "Resumo de oportunidades" (contagem agregada, se
--    um dia existir) != indicacao factual de demanda ativa.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Vitrine publica de empresas (resumo, sem contato, sem needs)
-- ------------------------------------------------------------
create or replace function public.search_companies_public(
  p_state text default null,
  p_city text default null,
  p_segment text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  segment text,
  employee_count text,
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state,
    c.segment, c.employee_count, c.description
  from public.profiles p
  join public.companies c on c.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'company'
    and not p.is_test
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_segment is null or c.segment ilike '%' || p_segment || '%');
$$;

revoke all on function public.search_companies_public(text, text, text) from public;
grant execute on function public.search_companies_public(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Vitrine publica de profissionais: mesmas funcoes, agora
--    executaveis por anon (corpo inalterado, sem linkedin_url).
-- ------------------------------------------------------------
create or replace function public.search_professionals(
  p_state text default null,
  p_city text default null,
  p_specialization text default null
)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  education text,
  specialization text,
  experience text,
  service_radius text,
  hourly_rate numeric,
  availability text[],
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and (p_state is null or p.state = upper(p_state))
    and (p_city is null or p.city ilike '%' || p_city || '%')
    and (p_specialization is null or pr.specialization ilike '%' || p_specialization || '%');
$$;

create or replace function public.get_professional_public(p_id uuid)
returns table (
  id uuid,
  display_name text,
  city text,
  state text,
  avatar_path text,
  verification_status text,
  education text,
  specialization text,
  experience text,
  service_radius text,
  hourly_rate numeric,
  availability text[],
  description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.city, p.state, p.avatar_path,
    p.verification_status, pr.education, pr.specialization, pr.experience,
    pr.service_radius, pr.hourly_rate, pr.availability, pr.description
  from public.profiles p
  join public.professionals pr on pr.profile_id = p.id
  where p.verification_status = 'approved'
    and p.role = 'professional'
    and (not p.is_test or (select private.messaging_tester((select auth.uid()))))
    and p.id = p_id;
$$;

revoke all on function public.search_professionals(text, text, text) from public;
grant execute on function public.search_professionals(text, text, text) to anon, authenticated;
revoke all on function public.get_professional_public(uuid) from public;
grant execute on function public.get_professional_public(uuid) to anon, authenticated;

-- Avaliacoes continuam visiveis na vitrine (media e comentarios
-- publicos aprovados), sem expor a tabela ratings diretamente.
revoke all on function public.avaliacoes_resumo(uuid) from public;
grant execute on function public.avaliacoes_resumo(uuid) to anon, authenticated;
revoke all on function public.avaliacoes_do_perfil(uuid) from public;
grant execute on function public.avaliacoes_do_perfil(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Area logada: revoga anon/public, mantem apenas authenticated.
-- ------------------------------------------------------------
revoke all on function public.search_companies(text, text, text) from public, anon;
grant execute on function public.search_companies(text, text, text) to authenticated;

revoke all on function public.get_profile_public(uuid) from public, anon;
grant execute on function public.get_profile_public(uuid) to authenticated;

revoke all on function public.get_professional_shared_certificates(uuid) from public, anon;
grant execute on function public.get_professional_shared_certificates(uuid) to authenticated;

revoke all on function public.messaging_disponivel() from public, anon;
grant execute on function public.messaging_disponivel() to authenticated;

revoke all on function public.listar_contratos() from public, anon;
grant execute on function public.listar_contratos() to authenticated;

revoke all on function public.responder_contrato(uuid, text) from public, anon;
grant execute on function public.responder_contrato(uuid, text) to authenticated;

revoke all on function public.concluir_contrato(uuid) from public, anon;
grant execute on function public.concluir_contrato(uuid) to authenticated;

revoke all on function public.cancelar_contrato(uuid) from public, anon;
grant execute on function public.cancelar_contrato(uuid) to authenticated;

revoke all on function public.avaliar_contrato(uuid, smallint, text) from public, anon;
grant execute on function public.avaliar_contrato(uuid, smallint, text) to authenticated;

revoke all on function public.corrigir_avaliacao(uuid, smallint, text) from public, anon;
grant execute on function public.corrigir_avaliacao(uuid, smallint, text) to authenticated;

revoke all on function public.minhas_avaliacoes() from public, anon;
grant execute on function public.minhas_avaliacoes() to authenticated;

revoke all on function public.avaliacoes_pendentes() from public, anon;
grant execute on function public.avaliacoes_pendentes() to authenticated;

revoke all on function public.admin_denuncias_avaliacoes() from public, anon;
grant execute on function public.admin_denuncias_avaliacoes() to authenticated;

revoke all on function public.admin_revisar_denuncia_avaliacao(uuid, text) from public, anon;
grant execute on function public.admin_revisar_denuncia_avaliacao(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 4) ratings: leitura direta apenas autenticada (colunas ja
--    limitadas por grant na migracao 20261031040000); a vitrine
--    le avaliacoes pelas funcoes acima.
-- ------------------------------------------------------------
revoke select on public.ratings from public, anon;

-- ------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar no SQL editor do Supabase):
--   select p.proname,
--          pg_get_function_identity_arguments(p.oid) as args,
--          p.proacl
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--   order by 1;
-- Esperado: o role anon consta com EXECUTE apenas em
--   search_companies_public, search_professionals,
--   get_professional_public, avaliacoes_resumo e
--   avaliacoes_do_perfil. Qualquer outra funcao public com anon
--   indica divergencia residual no catalogo.
-- ------------------------------------------------------------
