-- Guard ampliado: usuario autenticado NAO admin nao pode alterar colunas
-- sensiveis do proprio perfil (role, verification_status, is_test).
-- Cobre escalada via profiles_update (policy pre-existente ampla).
-- Admin autenticado e service_role/dashboard (auth.uid() null) seguem podendo.

create or replace function private.profiles_sensitive_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    if new.role is distinct from old.role then
      raise exception 'role somente operacao administrativa';
    end if;
    if new.verification_status is distinct from old.verification_status then
      raise exception 'verification_status somente operacao administrativa';
    end if;
    if new.is_test is distinct from old.is_test then
      raise exception 'is_test somente operacao administrativa';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sensitive_guard on public.profiles;
create trigger profiles_sensitive_guard
  before update on public.profiles
  for each row execute function private.profiles_sensitive_guard();

drop trigger if exists profiles_is_test_guard on public.profiles;
drop function if exists private.profiles_is_test_guard();
