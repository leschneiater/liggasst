-- Capa de artigo do Radar TST (pedido dela em 04/11/2026):
-- bucket radar-covers (leitura publica, escrita so admin), coluna capa_path
-- em radar_posts, upload no editor do admin, 1200x630 (proporcao fixa,
-- validada no cliente com o mesmo criterio do carrossel).
--
-- ALEM DISSO: alinha a policy de leitura dos assinantes a regra unica
-- (private.plano_da_conta), para a cortesia (decisao dela 04/11) valer no Radar
-- tambem (o cliente ja liberava; a RLS inline de subscriptions barrava).
-- Mesma janela: pro ativo, cancelado/past_due dentro do periodo, production.

alter table public.radar_posts add column if not exists capa_path text;

-- Grants de coluna precisam incluir capa_path (escrita segue so admin via RLS).
grant insert (titulo, resumo, conteudo, publicado_em, status, capa_path) on public.radar_posts to authenticated;
grant update (titulo, resumo, conteudo, publicado_em, status, capa_path, updated_at) on public.radar_posts to authenticated;

-- Leitura de assinantes pela REGRA UNICA (cortesia incluida); rascunhos e
-- gestao continuam so admin (policies radar_posts_admin_* de 20261102210000).
drop policy if exists "radar_posts_select_pagantes" on public.radar_posts;
create policy "radar_posts_select_pagantes"
  on public.radar_posts for select
  to authenticated
  using (
    private.plano_da_conta((select auth.uid())) <> 'free'
    and publicado_em <= now()
    and status = 'publicado'
  );

-- Bucket das capas: leitura publica (o card/artigo mostram a imagem por URL
-- publica; o CONTEUDO do artigo segue pago), escrita so admin, 2 MB,
-- jpeg/png/webp (mesmo padrao do bucket ads).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('radar-covers', 'radar-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "radar_covers_select_publico" on storage.objects
  for select to public using (bucket_id = 'radar-covers');
create policy "radar_covers_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'radar-covers' and (select private.is_admin()));
create policy "radar_covers_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'radar-covers' and (select private.is_admin())) with check (bucket_id = 'radar-covers' and (select private.is_admin()));
create policy "radar_covers_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'radar-covers' and (select private.is_admin()));
