-- Caixa de entrada do formulario de Contato. PREPARADO, NAO APLICADO.
-- A mensagem so entra pela edge function contato-enviar (service role).
-- A admin le, marca e exclui. Nenhuma politica de insert para anon/authenticated.
-- Nao guarda IP nem anexos. Sem exclusao automatica: a exclusao e manual (admin).

create table if not exists public.contato_mensagens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null check (char_length(nome) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  telefone text check (telefone is null or char_length(telefone) <= 30),
  empresa text check (empresa is null or char_length(empresa) <= 120),
  assunto text not null check (char_length(assunto) between 1 and 150),
  mensagem text not null check (char_length(mensagem) between 10 and 4000),
  status text not null default 'nova' check (status in ('nova', 'respondida', 'spam')),
  status_at timestamptz
);

create index if not exists contato_mensagens_email_created_idx on public.contato_mensagens (email, created_at desc);
create index if not exists contato_mensagens_created_idx on public.contato_mensagens (created_at desc);

alter table public.contato_mensagens enable row level security;
revoke all on public.contato_mensagens from anon, authenticated;
grant select, update (status, status_at), delete on public.contato_mensagens to authenticated;

create policy "contato_mensagens_admin_select" on public.contato_mensagens
  for select to authenticated using ((select private.is_admin()));
create policy "contato_mensagens_admin_update" on public.contato_mensagens
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "contato_mensagens_admin_delete" on public.contato_mensagens
  for delete to authenticated using ((select private.is_admin()));
