-- Guard: profiles.is_test so pode ser alterado por service_role/dashboard
-- (auth.uid() is null) ou por admin via funcoes service. Usuario autenticado
-- nao pode marcar/desmarcar a propria flag (efeito seria so auto-exclusao da
-- busca, mas a flag deve permanecer estritamente operacional).

create or replace function private.profiles_is_test_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_test is distinct from old.is_test and (select auth.uid()) is not null then
    raise exception 'is_test somente operacao administrativa';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_is_test_guard on public.profiles;
create trigger profiles_is_test_guard
  before update on public.profiles
  for each row execute function private.profiles_is_test_guard();
