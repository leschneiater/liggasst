-- LiggaSST: LinkedIn como URL opcional no perfil profissional
--
-- Decisao da usuaria (31/10): LinkedIn entra como link no perfil;
-- audiencia decidida em 31/10 ("Sim so para logados", confirmada como
-- empresas logadas) — a exposicao nas funcoes de busca fica na
-- reconciliacao explicita 20261031140000.
--
-- 1) Nova coluna professionals.linkedin_url, opcional, restrita a URLs
--    https do dominio linkedin.com (evita link arbitrario/malicioso).
-- 2) Grant de update por coluna para authenticated: sem ele a pagina de
--    perfil nao salvaria (grants por coluna, 20260903190000).
-- 3) As funcoes de busca NAO sao recriadas aqui: a definicao final e da
--    reconciliacao explicita (20261031140000).

alter table public.professionals
  add column if not exists linkedin_url text;

alter table public.professionals
  drop constraint if exists professionals_linkedin_url_check;
alter table public.professionals
  add constraint professionals_linkedin_url_check
  check (linkedin_url is null or linkedin_url ~ '^https://([a-z0-9-]+\.)*linkedin\.com(/|$)');

grant update (linkedin_url) on public.professionals to authenticated;
