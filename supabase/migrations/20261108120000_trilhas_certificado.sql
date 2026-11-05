-- Etapa 5 das trilhas: certificado de conclusao com codigo de autenticidade
-- e verificacao publica (pedido dela 05/11).
-- SEM assinatura nem registro de curador: o certificado declara apenas a
-- conclusao do curso livre na plataforma (rodape aprovado por ela).
--
-- 1) trails.carga_horaria_min: carga horaria opcional impressa no certificado.
-- 2) public.trail_certificates: um certificado por (perfil, trilha), emitido
--    so via RPC depois da aprovacao na prova; membro le o seu, admin le tudo,
--    anon nao le a tabela.
-- 3) RPC trail_certificado_emitir (authenticated): valida aprovacao, idempotente.
-- 4) RPC trail_certificado_verificar (anon + authenticated): confirma o codigo
--    e devolve so os campos publicos do certificado.

alter table public.trails
  add column if not exists carga_horaria_min integer
    check (carga_horaria_min is null or carga_horaria_min > 0);

create table public.trail_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trail_id uuid not null references public.trails(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^LST-[0-9A-F]{10}$'),
  -- Snapshots: o certificado impresso nao muda se o perfil ou a trilha mudarem.
  nome text not null,
  trilha_titulo text not null,
  carga_horaria_min integer,
  nota integer not null check (nota between 0 and 100),
  emitido_em timestamptz not null default now(),
  unique (profile_id, trail_id)
);

create index trail_certificates_profile_idx on public.trail_certificates (profile_id);

revoke all on public.trail_certificates from public, anon, authenticated;
grant select on public.trail_certificates to authenticated;

alter table public.trail_certificates enable row level security;

create policy trail_certificates_select_own on public.trail_certificates
  for select to authenticated
  using (profile_id = auth.uid());

create policy trail_certificates_select_admin on public.trail_certificates
  for select to authenticated
  using ((select private.is_admin()));

-- Sem policies de insert/update/delete: so a RPC (security definer) escreve.

-- ---------------------------------------------------------------------------
-- Emissao: exige aprovacao na prova da trilha; idempotente por (perfil, trilha)
-- ---------------------------------------------------------------------------
create or replace function public.trail_certificado_emitir(p_trail uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trail public.trails%rowtype;
  v_nome text;
  v_nota integer;
  v_codigo text;
  v_cert public.trail_certificates%rowtype;
begin
  if v_uid is null then
    raise exception 'nao autenticado';
  end if;

  select * into v_trail from public.trails where id = p_trail;
  if not found or not v_trail.published or v_trail.kind <> 'certified' then
    raise exception 'trilha sem certificado';
  end if;

  select max(score) into v_nota
    from public.exam_attempts
   where profile_id = v_uid and trail_id = p_trail and passed;
  if v_nota is null then
    raise exception 'certificado so apos aprovacao na avaliacao';
  end if;

  -- Idempotente: certificado ja emitido volta como esta.
  select * into v_cert from public.trail_certificates
   where profile_id = v_uid and trail_id = p_trail;
  if found then
    return to_jsonb(v_cert);
  end if;

  select display_name into v_nome from public.profiles where id = v_uid;

  loop
    v_codigo := 'LST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.trail_certificates
        (profile_id, trail_id, codigo, nome, trilha_titulo, carga_horaria_min, nota)
      values
        (v_uid, p_trail, v_codigo, coalesce(nullif(trim(v_nome), ''), 'Assinante Ligga'),
         v_trail.titulo, v_trail.carga_horaria_min, v_nota)
      returning * into v_cert;
      exit;
    exception when unique_violation then
      -- Colisao de codigo: tenta outro. Concorrência no par (perfil, trilha):
      -- devolve o que o outro processo gravou.
      select * into v_cert from public.trail_certificates
       where profile_id = v_uid and trail_id = p_trail;
      if found then
        return to_jsonb(v_cert);
      end if;
    end;
  end loop;

  return to_jsonb(v_cert);
end;
$$;

revoke all on function public.trail_certificado_emitir(uuid) from public, anon;
grant execute on function public.trail_certificado_emitir(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Verificacao publica: qualquer pessoa confirma o codigo; devolve so os
-- campos que o proprio certificado ja imprime (sem profile_id nem trilha_id)
-- ---------------------------------------------------------------------------
create or replace function public.trail_certificado_verificar(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.trail_certificates%rowtype;
begin
  select * into v_cert from public.trail_certificates
   where codigo = upper(trim(coalesce(p_codigo, '')));
  if not found then
    return jsonb_build_object('valido', false);
  end if;
  return jsonb_build_object(
    'valido', true,
    'codigo', v_cert.codigo,
    'nome', v_cert.nome,
    'trilha_titulo', v_cert.trilha_titulo,
    'carga_horaria_min', v_cert.carga_horaria_min,
    'nota', v_cert.nota,
    'emitido_em', v_cert.emitido_em
  );
end;
$$;

revoke all on function public.trail_certificado_verificar(text) from public;
grant execute on function public.trail_certificado_verificar(text) to anon, authenticated;
