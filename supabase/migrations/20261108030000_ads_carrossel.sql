-- Carrossel de anuncios no plano GRATUITO (decisao dela em 04/11/2026):
-- banners aparecem DENTRO das areas logadas de contas gratuitas
-- (paineis), NUNCA para assinante pago e NUNCA na landing page.
-- Admin (ela) gerencia tudo pelo painel: upload da arte, link opcional,
-- ordem, ativar/desativar, tempo de exibicao por arte e maximo de artes
-- ativas (padroes 5s / 5 artes, editaveis), com contagem de cliques.
--
-- Gate no banco (fail-closed): SELECT de banners ativos so para conta
-- autenticada cuja assinatura NAO e paga vigente — mesma regra unica de
-- acesso pago (pro_* ativo, ou cancelado/em atraso dentro do periodo,
-- somente environment='production'; usada por private.plano_da_conta).
-- Pagante nao le nem ativo; admin ve e edita tudo (private.is_admin()).
-- Clique so conta via RPC (incremento no servidor), sem UPDATE direto.
-- Imagens no bucket publico "ads" (leitura publica, escrita so admin).

-- ------------------------------------------------------------
-- 1) Banners
-- ------------------------------------------------------------
create table if not exists public.ads_banners (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  imagem_path text not null,
  link text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  cliques integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ads_banners enable row level security;

revoke all on public.ads_banners from public;
grant select on public.ads_banners to authenticated;
grant insert (titulo, imagem_path, link, ordem, ativo) on public.ads_banners to authenticated;
grant update (titulo, imagem_path, link, ordem, ativo, updated_at) on public.ads_banners to authenticated;
grant delete on public.ads_banners to authenticated;

-- Leitura: conta gratuita (sem plano pago vigente) ve so ativos;
-- admin ve tudo (rascunhos/inativos) para gerenciar.
create policy "ads_banners_select_free"
  on public.ads_banners for select
  to authenticated
  using (ativo and private.plano_da_conta((select auth.uid())) = 'free');

create policy "ads_banners_admin_select" on public.ads_banners
  for select to authenticated using ((select private.is_admin()));
create policy "ads_banners_admin_insert" on public.ads_banners
  for insert to authenticated with check ((select private.is_admin()));
create policy "ads_banners_admin_update" on public.ads_banners
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "ads_banners_admin_delete" on public.ads_banners
  for delete to authenticated using ((select private.is_admin()));

-- ------------------------------------------------------------
-- 2) Config do carrossel (singleton): tempo por arte + max ativas
-- ------------------------------------------------------------
create table if not exists public.ads_config (
  id boolean primary key default true check (id),
  intervalo_segundos integer not null default 5 check (intervalo_segundos between 2 and 120),
  max_ativos integer not null default 5 check (max_ativos between 1 and 20),
  updated_at timestamptz not null default now()
);

insert into public.ads_config (id) values (true) on conflict (id) do nothing;

alter table public.ads_config enable row level security;

revoke all on public.ads_config from public;
grant select on public.ads_config to authenticated;
grant update (intervalo_segundos, max_ativos, updated_at) on public.ads_config to authenticated;

-- Qualquer logado le a config (e so tempo/quantidade); escrever, so admin.
create policy "ads_config_select_logado"
  on public.ads_config for select
  to authenticated
  using (true);

create policy "ads_config_admin_update" on public.ads_config
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ------------------------------------------------------------
-- 3) Contagem de cliques (so via RPC; sem UPDATE direto na tabela)
-- ------------------------------------------------------------
create or replace function public.registrar_clique_ad(p_banner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ads_banners
  set cliques = cliques + 1
  where id = p_banner_id and ativo;
end;
$$;

revoke all on function public.registrar_clique_ad(uuid) from public;
grant execute on function public.registrar_clique_ad(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Bucket publico "ads": leitura aberta, escrita so admin
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "ads_storage_select_publico" on storage.objects
  for select to public using (bucket_id = 'ads');
create policy "ads_storage_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ads' and (select private.is_admin()));
create policy "ads_storage_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'ads' and (select private.is_admin())) with check (bucket_id = 'ads' and (select private.is_admin()));
create policy "ads_storage_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'ads' and (select private.is_admin()));
