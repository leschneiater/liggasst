-- ============================================================
-- PREPARAÇÃO REVERSÍVEL — NÃO APLICAR EM PRODUÇÃO sem aprovação
-- de publicação da Letícia.
--
-- Avaliações mútuas após contrato concluído (empresa <-> profissional).
--
-- Decisões APROVADAS pela usuária (WhatsApp 31/10/2026):
--  - 09:05 "Os dois possam se avaliar": empresa e profissional se
--    avaliam mutuamente após a conclusão do contrato.
--  - 09:06 "Pode ser": nota de 1 a 5 estrelas + comentário opcional.
--  - 09:06 "Fica aberto para todos": notas e comentários visíveis
--    nos perfis para outros USUÁRIOS CADASTRADOS (não abre perfil
--    para visitante sem login).
--  - 09:08 "Pode ser sim": revelação CEGA — a avaliação só aparece
--    quando os DOIS lados enviarem a sua, ou quando o prazo para
--    avaliar terminar; depois disso fica visível aos cadastrados.
--  - 09:17 "Pode": prazo de 14 DIAS após a conclusão para enviar a
--    avaliação; se só um lado avaliar, revela ao fim do prazo. O
--    prazo encerra a janela de envio.
--  - 09:18 "Sim": correção da PRÓPRIA avaliação permitida enquanto
--    ela estiver oculta; depois de revelada, nota e comentário
--    ficam definitivos. (Remover avaliação não foi aprovado: delete
--    segue bloqueado.)
--  - 09:19 "Sim": botão para denunciar avaliações ofensivas/indevidas,
--    com revisão no painel da administradora.
--  - 09:20: moderação — enquanto o comentário estiver EM REVISÃO ele
--    NÃO fica visível ao público; no painel ela decide EXCLUIR O
--    COMENTÁRIO ou mantê-lo. A NOTA e o registro da avaliação são
--    preservados (escopo fixado pelo main: não inferir exclusão da
--    nota nem do registro). Fluxo reconhecido por ela com 👍 (09:27).
--  - 09:48 "Sim" (resposta direta à pergunta sobre o destino do
--    texto excluído): o comentário excluído sai da exibição pública,
--    mas uma CÓPIA fica retida e visível SÓ para a administração
--    (auditoria da revisão). Não é apagado do banco.
--  - 09:49 "Pode" (resposta à proposta final de publicação):
--    autoria NOMINAL na avaliação pública; avaliações do profissional
--    no perfil e as da empresa no card da busca; UMA denúncia por
--    pessoa por avaliação; SEM novos avisos nem e-mails nesta etapa;
--    publicação com credencial temporária de GitHub, revogada ao
--    concluir. Escopo fora: criação de contas/dados de teste.
--
-- Reversão: drop tables public.rating_reports e public.ratings; drop
-- functions public.avaliar_contrato, public.corrigir_avaliacao,
-- public.minhas_avaliacoes, public.avaliacoes_resumo,
-- public.avaliacoes_pendentes, public.avaliacoes_do_perfil,
-- public.admin_denuncias_avaliacoes,
-- public.admin_revisar_denuncia_avaliacao,
-- private.avaliacao_revelada, private.avaliacao_comentario_visivel;
-- drop trigger avaliacao_guarda + function private.avaliacao_guarda.
-- Nenhum dado existente é tocado.
-- ============================================================

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  rated_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  -- comentário opcional (aprovado 09:06)
  comment text check (comment is null or char_length(comment) between 1 and 1000),
  -- moderação (09:20): preenchido quando a admin exclui o comentário;
  -- o texto fica retido para auditoria, só some da exibição.
  comment_removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- uma avaliação por contrato por lado
  unique (contract_id, rater_id),
  check (rater_id <> rated_id)
);
alter table public.ratings enable row level security;

-- Sem insert/update/delete direto: escrita só pelas RPCs, como nos contratos.

-- ---------- revelação cega (09:08) + prazo 14 dias (09:17) ----------
-- Revelada quando o PAR existe (os dois lados avaliaram) ou quando o
-- prazo de 14 dias após a conclusão terminou. updated_at do contrato é
-- a data da conclusão (guardas mantêm updated_at = now() na transição
-- para completed e contrato concluído é imutável).
create or replace function private.avaliacao_revelada(p_contract_id uuid, p_rater_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.ratings x
           where x.contract_id = p_contract_id and x.rater_id <> p_rater_id
         )
      or exists (
           select 1 from public.contracts c
           where c.id = p_contract_id
             and c.updated_at + interval '14 days' <= now()
         );
$$;

revoke all on function private.avaliacao_revelada(uuid, uuid) from public;
grant execute on function private.avaliacao_revelada(uuid, uuid) to authenticated;

-- Leitura: cadastrados veem avaliações REVELADAS; o autor sempre vê a
-- própria; anônimo não lê (09:06). O COMENTÁRIO não sai pela leitura
-- direta: a regra de ocultação (em revisão / excluído pela moderação,
-- 09:20) fica nas funções. Nota e demais campos seguem legíveis.
grant select (id, contract_id, rater_id, rated_id, score, created_at, updated_at)
  on public.ratings to authenticated;

drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings for select to authenticated
  using (
    rater_id = (select auth.uid())
    or (select private.avaliacao_revelada(contract_id, rater_id))
  );

-- ---------- denúncia de avaliações (09:19) ----------
-- Mesmo padrão de message_reports: motivos iguais, status
-- open/reviewed/actioned; autor da denúncia lê a própria; admin lê e
-- atualiza. Só se denuncia avaliação REVELADA de outro usuário.
create table if not exists public.rating_reports (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'assedio', 'conteudo-improprio', 'golpe', 'outro')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (rating_id, reporter_id)
);
alter table public.rating_reports enable row level security;

grant select, insert on public.rating_reports to authenticated;

drop policy if exists rating_reports_insert on public.rating_reports;
create policy rating_reports_insert on public.rating_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1 from public.ratings r
    where r.id = rating_id
      and r.rater_id <> (select auth.uid())
      and (select private.avaliacao_revelada(r.contract_id, r.rater_id))
  )
);

drop policy if exists rating_reports_select on public.rating_reports;
create policy rating_reports_select on public.rating_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

-- ---------- comentário visível ao público? (09:20) ----------
-- Visível quando não excluído pela moderação E sem denúncia em aberto.
create or replace function private.avaliacao_comentario_visivel(p_rating_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select r.comment_removed_at is null
     and not exists (
           select 1 from public.rating_reports rp
           where rp.rating_id = r.id and rp.status = 'open'
         )
  from public.ratings r
  where r.id = p_rating_id;
$$;

revoke all on function private.avaliacao_comentario_visivel(uuid) from public;
grant execute on function private.avaliacao_comentario_visivel(uuid) to authenticated;

-- ---------- envio (somente partes, contrato concluído, no prazo) ----------
create or replace function public.avaliar_contrato(
  p_contract_id uuid,
  p_score smallint,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contracts%rowtype;
  v_rated uuid;
  v_id uuid;
begin
  if p_score is null or p_score < 1 or p_score > 5 then
    raise exception 'nota invalida: use de 1 a 5';
  end if;

  -- FOR UPDATE serializa envio e correção sobre o mesmo contrato:
  -- a revelação pelo par e a correção se resolvem pela fila de lock.
  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contrato nao encontrado';
  end if;
  if c.company_id <> (select auth.uid()) and c.professional_id <> (select auth.uid()) then
    raise exception 'somente as partes do contrato podem avalia-lo';
  end if;
  if c.status <> 'completed' then
    raise exception 'so e possivel avaliar contratos concluidos';
  end if;
  -- prazo para avaliar: 14 dias após a conclusão (aprovado 09:17)
  if c.updated_at + interval '14 days' <= now() then
    raise exception 'o prazo para avaliar este contrato terminou';
  end if;

  v_rated := case when c.company_id = (select auth.uid())
                  then c.professional_id else c.company_id end;

  insert into public.ratings (contract_id, rater_id, rated_id, score, comment)
  values (c.id, (select auth.uid()), v_rated, p_score, nullif(btrim(p_comment), ''))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'voce ja avaliou este contrato';
end;
$$;

revoke all on function public.avaliar_contrato(uuid, smallint, text) from public;
grant execute on function public.avaliar_contrato(uuid, smallint, text) to authenticated;

-- ---------- guarda (correção 09:18 + moderação 09:20) ----------
create or replace function private.avaliacao_guarda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'DELETE' then
    raise exception 'avaliacao enviada nao pode ser removida';
  end if;

  -- Moderação: SÓ comment_removed_at muda (via RPC admin). Permitido
  -- mesmo após revelação, sem tocar nota/comentário/partes.
  if new.contract_id is not distinct from old.contract_id
     and new.rater_id is not distinct from old.rater_id
     and new.rated_id is not distinct from old.rated_id
     and new.score is not distinct from old.score
     and new.comment is not distinct from old.comment
     and new.comment_removed_at is distinct from old.comment_removed_at then
    new.updated_at := now();
    return new;
  end if;

  if new.contract_id is not distinct from old.contract_id
     and new.rater_id is not distinct from old.rater_id
     and new.rated_id is not distinct from old.rated_id then
    -- Correção pela própria pessoa, só enquanto oculta (09:18).
    if (select private.avaliacao_revelada(old.contract_id, old.rater_id)) then
      raise exception 'avaliacao ja revelada nao pode mais ser alterada';
    end if;
    if new.comment_removed_at is distinct from old.comment_removed_at then
      raise exception 'comment_removed_at so muda pela moderacao';
    end if;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'contrato e partes da avaliacao nao podem ser alterados';
end;
$$;

drop trigger if exists avaliacao_guarda on public.ratings;
create trigger avaliacao_guarda
  before update or delete on public.ratings
  for each row execute function private.avaliacao_guarda();

-- Correção da própria avaliação ainda oculta (09:18).
create or replace function public.corrigir_avaliacao(
  p_contract_id uuid,
  p_score smallint,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_score is null or p_score < 1 or p_score > 5 then
    raise exception 'nota invalida: use de 1 a 5';
  end if;
  -- Serializa com o envio do par (que revela): quem espera no lock
  -- relê o estado atual e cai na guarda se já tiver revelado.
  perform 1 from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contrato nao encontrado';
  end if;

  update public.ratings
  set score = p_score, comment = nullif(btrim(p_comment), '')
  where contract_id = p_contract_id and rater_id = (select auth.uid());
  if not found then
    raise exception 'voce ainda nao avaliou este contrato';
  end if;
end;
$$;

revoke all on function public.corrigir_avaliacao(uuid, smallint, text) from public;
grant execute on function public.corrigir_avaliacao(uuid, smallint, text) to authenticated;

-- ---------- leituras ----------
-- Próprias avaliações: FEITAS sempre com comentário (autor vê o seu,
-- com flag de ocultação); RECEBIDAS só reveladas (09:08) e com
-- comentário mascarado quando em revisão/excluído (09:20).
create or replace function public.minhas_avaliacoes()
returns table (
  id uuid,
  contract_id uuid,
  direcao text,
  score smallint,
  comment text,
  comentario_oculto boolean,
  created_at timestamptz,
  contraparte_nome text,
  contrato_titulo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.contract_id,
    case when r.rater_id = (select auth.uid()) then 'feita' else 'recebida' end,
    r.score,
    case
      when r.rater_id = (select auth.uid()) then r.comment
      when (select private.avaliacao_comentario_visivel(r.id)) then r.comment
      else null
    end,
    case
      when r.rater_id = (select auth.uid())
        then not (select private.avaliacao_comentario_visivel(r.id)) and r.comment is not null
      else not (select private.avaliacao_comentario_visivel(r.id)) and r.comment is not null
    end,
    r.created_at,
    p.display_name, coalesce(c.title, d.title, 'Contrato de serviço')
  from public.ratings r
  join public.profiles p on p.id = case when r.rater_id = (select auth.uid())
                                        then r.rated_id else r.rater_id end
  join public.contracts c on c.id = r.contract_id
  left join public.demands d on d.id = c.demand_id
  where (r.rater_id = (select auth.uid()) or r.rated_id = (select auth.uid()))
    and (r.rater_id = (select auth.uid())
         or (select private.avaliacao_revelada(r.contract_id, r.rater_id)))
  order by r.created_at desc;
$$;

revoke all on function public.minhas_avaliacoes() from public;
grant execute on function public.minhas_avaliacoes() to authenticated;

-- Resumo público do perfil (média e total de REVELADAS), para perfil
-- e busca (09:06). Avaliações ainda cegas não entram na média; a nota
-- segue contando mesmo com comentário em revisão (09:20).
create or replace function public.avaliacoes_resumo(p_profile uuid)
returns table (media numeric, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(r.score), 1), count(*)
  from public.ratings r
  where r.rated_id = p_profile
    and (select private.avaliacao_revelada(r.contract_id, r.rater_id));
$$;

revoke all on function public.avaliacoes_resumo(uuid) from public;
grant execute on function public.avaliacoes_resumo(uuid) to authenticated;

-- Contratos concluídos do chamador que ele ainda pode avaliar (sem
-- avaliação enviada e dentro do prazo), com data limite.
create or replace function public.avaliacoes_pendentes()
returns table (
  contract_id uuid,
  contraparte_nome text,
  contrato_titulo text,
  concluido_em timestamptz,
  prazo_fim timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
    case when c.company_id = (select auth.uid()) then prof.display_name else emp.display_name end,
    coalesce(c.title, d.title, 'Contrato de serviço'),
    c.updated_at,
    c.updated_at + interval '14 days'
  from public.contracts c
  join public.profiles emp on emp.id = c.company_id
  join public.profiles prof on prof.id = c.professional_id
  left join public.demands d on d.id = c.demand_id
  where c.status = 'completed'
    and (c.company_id = (select auth.uid()) or c.professional_id = (select auth.uid()))
    and c.updated_at + interval '14 days' > now()
    and not exists (
      select 1 from public.ratings r
      where r.contract_id = c.id and r.rater_id = (select auth.uid())
    )
  order by c.updated_at desc;
$$;

revoke all on function public.avaliacoes_pendentes() from public;
grant execute on function public.avaliacoes_pendentes() to authenticated;

-- Avaliações REVELADAS recebidas por um perfil, para a vitrine (09:06/
-- 09:08). Comentário mascarado quando em revisão/excluído (09:20).
-- [Autoria nominal APROVADA em 09:49 na proposta de publicação.]
create or replace function public.avaliacoes_do_perfil(p_profile uuid)
returns table (
  id uuid,
  rater_id uuid,
  score smallint,
  comment text,
  created_at timestamptz,
  autor_nome text,
  contrato_titulo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rater_id, r.score,
    case when (select private.avaliacao_comentario_visivel(r.id)) then r.comment else null end,
    r.created_at,
    p.display_name, coalesce(c.title, d.title, 'Contrato de serviço')
  from public.ratings r
  join public.profiles p on p.id = r.rater_id
  join public.contracts c on c.id = r.contract_id
  left join public.demands d on d.id = c.demand_id
  where r.rated_id = p_profile
    and (select private.avaliacao_revelada(r.contract_id, r.rater_id))
  order by r.created_at desc;
$$;

revoke all on function public.avaliacoes_do_perfil(uuid) from public;
grant execute on function public.avaliacoes_do_perfil(uuid) to authenticated;

-- ---------- moderação (09:19/09:20) ----------
-- Fila da admin com o conteúdo necessário à decisão (a leitura direta
-- do comentário é restrita, então a visão da admin passa por aqui).
create or replace function public.admin_denuncias_avaliacoes()
returns table (
  report_id uuid,
  rating_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reporter_nome text,
  autor_nome text,
  avaliado_nome text,
  score smallint,
  comment text,
  comment_removed_at timestamptz,
  denuncias_abertas bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select rp.id, rp.rating_id, rp.reason, rp.details, rp.status, rp.created_at,
    rep.display_name, aut.display_name, ava.display_name,
    r.score, r.comment, r.comment_removed_at,
    (select count(*) from public.rating_reports x
      where x.rating_id = rp.rating_id and x.status = 'open')
  from public.rating_reports rp
  join public.ratings r on r.id = rp.rating_id
  join public.profiles rep on rep.id = rp.reporter_id
  join public.profiles aut on aut.id = r.rater_id
  join public.profiles ava on ava.id = r.rated_id
  where (select private.is_admin())
  order by case when rp.status = 'open' then 0 else 1 end, rp.created_at desc;
$$;

revoke all on function public.admin_denuncias_avaliacoes() from public;
grant execute on function public.admin_denuncias_avaliacoes() to authenticated;

-- Decisão da admin sobre uma denúncia (09:20):
--  - 'manter': arquiva a denúncia como revisada; sem denúncias em
--    aberto, o comentário volta a aparecer;
--  - 'excluir-comentario': marca comment_removed_at (o comentário some
--    de vez da exibição pública; nota e registro preservados) e fecha
--    todas as denúncias abertas daquela avaliação como 'actioned'.
create or replace function public.admin_revisar_denuncia_avaliacao(p_report_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rp public.rating_reports%rowtype;
begin
  if not (select private.is_admin()) then
    raise exception 'somente a administracao revisa denuncias';
  end if;
  if p_acao not in ('manter', 'excluir-comentario') then
    raise exception 'acao invalida: %', p_acao;
  end if;

  select * into rp from public.rating_reports where id = p_report_id for update;
  if not found then
    raise exception 'denuncia nao encontrada';
  end if;
  if rp.status <> 'open' then
    raise exception 'esta denuncia ja foi revisada';
  end if;

  if p_acao = 'manter' then
    update public.rating_reports set status = 'reviewed' where id = rp.id;
  else
    update public.ratings set comment_removed_at = now() where id = rp.rating_id;
    update public.rating_reports set status = 'actioned'
    where rating_id = rp.rating_id and status = 'open';
  end if;
end;
$$;

revoke all on function public.admin_revisar_denuncia_avaliacao(uuid, text) from public;
grant execute on function public.admin_revisar_denuncia_avaliacao(uuid, text) to authenticated;
