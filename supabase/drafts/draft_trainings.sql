-- RASCUNHO (não aplicado): módulo de treinamentos administrados.
-- Admin cadastra treinamentos; cada item tem público próprio (empresa,
-- profissional ou ambos) e pode combinar vídeo do YouTube (embed), PDF
-- enviado (bucket privado) e link externo genérico (http/https, aberto em
-- nova aba, sem embed). Sem conclusão/certificado na v1.
-- Aplicar somente com aprovação própria de publicação/migração.

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  audience text not null check (audience in ('company', 'professional', 'both')),
  youtube_url text,
  pdf_path text,
  link_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- video, PDF e link externo sao opcionais, mas o treinamento precisa de
  -- ao menos um conteudo
  check (youtube_url is not null or pdf_path is not null or link_url is not null),
  -- pdf_path e sempre <uuid>.pdf, gerado pelo fluxo de upload; impede apontar
  -- para caminhos arbitrarios do bucket (inclusive de outros treinamentos)
  check (pdf_path is null or pdf_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'),
  -- link externo somente http/https; nunca embed/HTML arbitrario
  check (link_url is null or link_url ~ '^https?://')
);

alter table public.trainings enable row level security;

-- Membros aprovados leem apenas treinamentos publicados do próprio público.
drop policy if exists trainings_member_select on public.trainings;
create policy trainings_member_select on public.trainings for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.verification_status = 'approved'
        and (
          audience = 'both'
          or (audience = 'company' and p.role = 'company')
          or (audience = 'professional' and p.role = 'professional')
        )
    )
  );

-- Admin (role admin) gerencia tudo, inclusive rascunhos.
drop policy if exists trainings_admin_all on public.trainings;
create policy trainings_admin_all on public.trainings for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

revoke all on public.trainings from public;
grant select on public.trainings to authenticated;
grant insert (title, description, audience, youtube_url, pdf_path, link_url, status, created_by) on public.trainings to authenticated;
grant update (title, description, audience, youtube_url, pdf_path, link_url, status) on public.trainings to authenticated;
grant delete on public.trainings to authenticated;

-- Bucket privado para os PDFs de treinamento. Limite 10 MB por arquivo
-- (mesmo teto do bucket documents; PDFs leves cabem na cota do plano Free).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainings', 'trainings', false, 10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage: somente admin escreve/remove/lista; nenhuma leitura direta por
-- membro. A leitura do arquivo acontece via Edge Function training-file-url
-- (URL assinada curta), que confere papel + público + status antes de assinar.
-- O select de admin existe para o painel poder gerenciar os objetos e porque
-- DELETE/UPDATE com WHERE exigem policy de select na linha.
drop policy if exists trainings_storage_admin_select on storage.objects;
create policy trainings_storage_admin_select on storage.objects for select to authenticated
  using (
    bucket_id = 'trainings'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists trainings_storage_admin_insert on storage.objects;
create policy trainings_storage_admin_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trainings'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists trainings_storage_admin_delete on storage.objects;
create policy trainings_storage_admin_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'trainings'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists trainings_storage_admin_update on storage.objects;
create policy trainings_storage_admin_update on storage.objects for update to authenticated
  using (
    bucket_id = 'trainings'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );
