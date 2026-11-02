-- Radar TST: gestao pelo painel admin (criar, editar, rascunho, publicar, excluir).
-- Sem agendamento: publicar = status 'publicado' + publicado_em = agora.
--
-- PRESERVA o gate dos assinantes: a policy radar_posts_select_pagantes continua
-- exigindo plano pro ativo, ambiente production e publicado_em <= now(), e passa
-- a exigir tambem status = 'publicado'. Artigos ja existentes ficam 'publicado'
-- (comportamento atual); novos nascem 'rascunho'.
-- Escrita e leitura total (inclui rascunhos) SO para admin (private.is_admin()).

alter table public.radar_posts
  add column if not exists status text not null default 'publicado'
  check (status in ('rascunho', 'publicado'));
alter table public.radar_posts alter column status set default 'rascunho';

drop policy if exists "radar_posts_select_pagantes" on public.radar_posts;
create policy "radar_posts_select_pagantes"
  on public.radar_posts for select
  to authenticated
  using (exists (
    select 1 from public.subscriptions s
    where s.profile_id = auth.uid()
      and s.plan in ('pro_professional', 'pro_company')
      and (
        s.status = 'active'
        or (s.status in ('canceled', 'past_due')
            and s.current_period_end >= current_date)
      )
      and s.environment = 'production'
  )
  and publicado_em <= now()
  and status = 'publicado');

revoke all on public.radar_posts from anon;
grant select on public.radar_posts to authenticated;
grant insert (titulo, resumo, conteudo, publicado_em, status) on public.radar_posts to authenticated;
grant update (titulo, resumo, conteudo, publicado_em, status, updated_at) on public.radar_posts to authenticated;
grant delete on public.radar_posts to authenticated;

create policy "radar_posts_admin_select" on public.radar_posts
  for select to authenticated using ((select private.is_admin()));
create policy "radar_posts_admin_insert" on public.radar_posts
  for insert to authenticated with check ((select private.is_admin()));
create policy "radar_posts_admin_update" on public.radar_posts
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "radar_posts_admin_delete" on public.radar_posts
  for delete to authenticated using ((select private.is_admin()));
