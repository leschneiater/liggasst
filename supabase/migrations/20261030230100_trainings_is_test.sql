-- Treinamentos: guarda de dados de teste. Itens marcados is_test=true ficam
-- invisiveis para QUALQUER membro (RLS), visiveis apenas para admin; a flag so
-- muda por service/dashboard (auth.uid() is null), como em profiles.is_test.
-- Protecao efetiva de backend para a validacao pos-publicacao de 30/10/2026:
-- conteudos de teste publicados nunca aparecem a membros reais.

alter table public.trainings
  add column if not exists is_test boolean not null default false;

-- Membro aprovado le publicados do proprio publico; conteudo is_test=true so
-- aparece para perfil is_test=true (membro real nunca ve teste; membro de
-- teste ve o conteudo de teste para o fluxo positivo de validacao).
drop policy if exists trainings_member_select on public.trainings;
create policy trainings_member_select on public.trainings for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.verification_status = 'approved'
        and (trainings.is_test = false or p.is_test)
        and (
          audience = 'both'
          or (audience = 'company' and p.role = 'company')
          or (audience = 'professional' and p.role = 'professional')
        )
    )
  );

-- A flag is_test nao pode ser marcada/desmarcada por usuario autenticado
-- (nem admin via PostgREST): somente service_role/dashboard.
create or replace function private.trainings_is_test_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.is_test and (select auth.uid()) is not null then
    raise exception 'is_test somente operacao administrativa';
  end if;
  if tg_op = 'UPDATE' and new.is_test is distinct from old.is_test and (select auth.uid()) is not null then
    raise exception 'is_test somente operacao administrativa';
  end if;
  return new;
end;
$$;

drop trigger if exists trainings_is_test_guard on public.trainings;
create trigger trainings_is_test_guard
  before insert or update on public.trainings
  for each row execute function private.trainings_is_test_guard();
