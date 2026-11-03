-- Isolamento de avaliacoes_do_perfil / avaliacoes_resumo.
-- Aprovado pela Leticia em 03/11/2026 (WhatsApp, "Ok" as 23:44, sobre a
-- proposta de corrigir o isolamento das duas funcoes).
--
-- Antes: qualquer usuario (inclusive anon) que conhecesse o uuid de um perfil
-- is_test ou nao aprovado recebia as avaliacoes reveladas e o resumo, embora
-- busca e get_professional_public ja ocultassem esse perfil.
-- Agora (mesma regra de get_professional_public): o perfil avaliado precisa
-- estar approved e (nao ser is_test OU quem consulta estar no gate de teste).
-- Nao muda assinatura, grants, regra de revelacao nem mascara de comentario.
-- Fora de escopo: nome/rater_id do avaliador exibidos a anon.
-- Reversao: recriar as duas funcoes sem o EXISTS (definicao em 20261031040000).

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
    and exists (
      select 1 from public.profiles pp
      where pp.id = p_profile
        and pp.verification_status = 'approved'
        and (not pp.is_test or (select private.messaging_tester((select auth.uid()))))
    )
    and (select private.avaliacao_revelada(r.contract_id, r.rater_id));
$$;

revoke all on function public.avaliacoes_resumo(uuid) from public;
grant execute on function public.avaliacoes_resumo(uuid) to anon, authenticated;

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
    and exists (
      select 1 from public.profiles pp
      where pp.id = p_profile
        and pp.verification_status = 'approved'
        and (not pp.is_test or (select private.messaging_tester((select auth.uid()))))
    )
    and (select private.avaliacao_revelada(r.contract_id, r.rater_id))
  order by r.created_at desc;
$$;

revoke all on function public.avaliacoes_do_perfil(uuid) from public;
grant execute on function public.avaliacoes_do_perfil(uuid) to anon, authenticated;
