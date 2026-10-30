-- Fase 3: persistir todos os campos do formulario de demanda, sem descarte silencioso.
--
-- Campos nao sensiveis passam a ter coluna em public.demands (demandas ativas
-- sao visiveis a todos os usuarios autenticados pela politica demands_select):
alter table public.demands
  add column if not exists modalidade text
    check (modalidade is null or modalidade in ('presencial', 'remoto', 'hibrido')),
  add column if not exists urgencia text
    check (urgencia is null or urgencia in ('baixa', 'media', 'alta')),
  add column if not exists tipo_orcamento text
    check (tipo_orcamento is null or tipo_orcamento in ('fixo', 'por-hora', 'negociavel'));

-- Dados de contato NAO vao para demands: ficam em public.companies, cuja
-- leitura e restrita ao dono e ao admin (companies_select/companies_update).
-- razao_social completa o conjunto responsible_name/responsible_email/
-- responsible_phone que ja existia nessa tabela:
alter table public.companies
  add column if not exists razao_social text;
