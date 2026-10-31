-- LiggaSST: conclusao de cadastro de contas criadas via OAuth
--
-- Modelo: a REGRA da transicao mora no trigger profiles_sensitive_guard
-- (recriado aqui), nao em chave de sessao nem so na RPC. Assim, por qualquer
-- caminho (RPC ou update direto do cliente), um usuario autenticado nao
-- administrador so consegue mudar role/verification_status quando TODAS as
-- condicoes valem:
--   - status anterior exatamente 'awaiting_completion' (conta nascida de
--     OAuth sem papel); 'pending' administrativo NUNCA habilita;
--   - status novo exatamente 'approved';
--   - papel novo em ('professional','company'); 'admin' impossivel;
--   - is_test inalterado;
--   - conta sem atividade (mensagens, demandas, contratos), para nunca
--     reescrever historico.
-- Fora dessa transicao, as protecoes atuais seguem identicas.
--
-- profiles_conclusao_cadastro (AFTER UPDATE) mantem as linhas de detalhes
-- coerentes por qualquer caminho: troca professionals <-> companies quando
-- o papel muda na conclusao.
--
-- public.completar_cadastro e o caminho do app: valida nome e papel e faz a
-- atualizacao unica. Precisa ser security definer porque role e
-- verification_status NAO tem grant de update para authenticated (grants por
-- coluna, 20260903190000) - o profiles_sensitive_guard continua valendo
-- porque le auth.uid() (claims JWT), nao o role da sessao. O guard e o
-- trigger acima garantem a invariante mesmo se a RPC for contornada.

create or replace function private.profiles_sensitive_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  conclusao_valida boolean;
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    conclusao_valida := old.verification_status = 'awaiting_completion'
      and new.verification_status = 'approved'
      and new.role in ('professional', 'company')
      and new.is_test is not distinct from old.is_test
      and not exists (
        select 1 from public.messages m
        where m.sender_id = old.id or m.receiver_id = old.id)
      and not exists (
        select 1 from public.demands d where d.company_id = old.id)
      and not exists (
        select 1 from public.contracts c
        where c.company_id = old.id or c.professional_id = old.id);
    if not conclusao_valida then
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
  end if;
  return new;
end;
$$;

create or replace function private.profiles_conclusao_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verification_status = 'awaiting_completion'
     and new.verification_status = 'approved' then
    if new.role = 'company' then
      delete from public.professionals pr where pr.profile_id = new.id;
      insert into public.companies (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
    else
      insert into public.professionals (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_conclusao_cadastro on public.profiles;
create trigger profiles_conclusao_cadastro
  after update on public.profiles
  for each row execute function private.profiles_conclusao_cadastro();

create or replace function public.completar_cadastro(
  p_role text,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rows int;
begin
  if v_uid is null then
    raise exception 'usuario nao autenticado';
  end if;
  if p_role not in ('professional', 'company') then
    raise exception 'papel invalido';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'nome obrigatorio';
  end if;

  update public.profiles p set
    role = p_role,
    display_name = trim(p_display_name),
    verification_status = 'approved',
    updated_at = now()
  where p.id = v_uid
    and p.verification_status = 'awaiting_completion';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'cadastro ja concluido ou conta nao elegivel';
  end if;
end;
$$;

revoke all on function public.completar_cadastro(text, text) from public;
revoke all on function public.completar_cadastro(text, text) from anon;
revoke all on function public.completar_cadastro(text, text) from authenticated;
grant execute on function public.completar_cadastro(text, text) to authenticated;
