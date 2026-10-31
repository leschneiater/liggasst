-- RASCUNHO de rollback do módulo de treinamentos (draft_trainings.sql).
-- Remove tudo que o módulo cria; não toca em nenhuma estrutura anterior.
-- Objetos do bucket 'trainings' devem ser removidos antes (o bucket não sai
-- com objetos dentro).

drop policy if exists trainings_member_select on public.trainings;
drop policy if exists trainings_admin_all on public.trainings;
drop trigger if exists trainings_is_test_guard on public.trainings;
drop function if exists private.trainings_is_test_guard();
drop table if exists public.trainings;

drop policy if exists trainings_storage_admin_select on storage.objects;
drop policy if exists trainings_storage_admin_insert on storage.objects;
drop policy if exists trainings_storage_admin_update on storage.objects;
drop policy if exists trainings_storage_admin_delete on storage.objects;
delete from storage.buckets where id = 'trainings';
-- A Edge Function training-file-url é removida com: supabase functions delete training-file-url
