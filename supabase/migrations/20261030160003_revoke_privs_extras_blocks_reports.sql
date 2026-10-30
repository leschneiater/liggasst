-- Higiene de privilegio minimo (aprovado pela usuaria em 30/10 14:12):
-- remove privilegios extras herdados dos default privileges do Supabase nas
-- tabelas criadas pela migration 20261030140000. TRUNCATE ignora RLS; os demais
-- (TRIGGER/REFERENCES) nao tem uso pela API. Nao alcancavel via PostgREST
-- (latente, sem exploracao pelo app). Nao altera DML nem policies: bloqueio e
-- denuncia seguem funcionando como validado no E2E de 30/10.
revoke truncate, trigger, references on public.conversation_blocks, public.message_reports from authenticated;
