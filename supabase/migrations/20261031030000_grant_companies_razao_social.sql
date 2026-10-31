-- 20261031030000_grant_companies_razao_social.sql
--
-- Corrige permissao de UPDATE em companies.razao_social.
--
-- Bug: a migracao 20261029230000 adicionou a coluna companies.razao_social,
-- mas o GRANT de UPDATE do unify (20260903190000) e por coluna e nao inclui
-- razao_social. Resultado: qualquer update do app que grave razao_social
-- (ex.: etapa de contato do Publicar Demanda) falha com
--   ERROR 42501: permission denied for table companies
-- Reproduzido em producao como role authenticated com JWT de empresa:
-- update public.companies set razao_social='X' where profile_id=<dona>
--   -> 42501 permission denied for table companies
--
-- A RLS (companies_update: dona ou admin) continua limitando as linhas;
-- este grant apenas libera a coluna, no mesmo padrao das colunas de
-- contato responsible_* ja liberadas.

grant update (razao_social) on public.companies to authenticated;
