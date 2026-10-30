-- OPCAO E: denuncia de mensagem/conversa para revisao da administracao.
-- Minimo viavel: registro + revisao pela Leticia no painel Supabase
-- (sem UI de moderacao nesta etapa). Status: open/reviewed/actioned.
-- Reversao: drop table.

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (reason in ('spam', 'assedio', 'conteudo-improprio', 'golpe', 'outro')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now()
);
alter table public.message_reports enable row level security;

-- Supabase concede por padrao; explicito para clareza
grant select, insert, update on public.message_reports to authenticated;

-- Denunciante cria e ve as proprias denuncias; admin ve e trata todas
create policy reports_insert on public.message_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_select on public.message_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy reports_update on public.message_reports for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
