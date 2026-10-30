-- ============================================================
-- PREPARAÇÃO REVERSÍVEL — NÃO APLICAR EM PRODUÇÃO sem aprovação
-- de publicação da Letícia.
-- Decisões de produto da Letícia (WhatsApp):
--  1) 30/10/2026 09:21: "ambos podem iniciar a conversa"
--     (empresa e profissional).
--  2) 30/10/2026 09:29: "perfeito! gostei da sugestão. podemos seguir"
--     aprovando a proteção proposta: cadastro rejeitado/pendente NÃO
--     envia mensagens, inclusive em conversas existentes.
-- Regras resultantes na policy messages_insert:
--  - Remetente precisa estar approved (resposta incluída).
--  - Resposta em conversa existente: permitida a participante approved.
--  - Início de conversa nova: apenas entre papéis opostos
--    (empresa <-> profissional), ambos approved.
-- Reversão: reexecutar a policy messages_insert original da
-- migração unify (sender = self, receiver <> self).
-- ============================================================

create or replace function private.pode_iniciar(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles sa
    join public.profiles sb on sb.id = b
    where sa.id = a
      and sa.verification_status = 'approved' and sb.verification_status = 'approved'
      and ((sa.role = 'company' and sb.role = 'professional')
        or (sa.role = 'professional' and sb.role = 'company'))
  );
$$;

-- Padrao de private.is_admin: revogar chamada direta publica, manter
-- execute para authenticated (necessario a avaliacao da policy). O schema
-- private nao e exposto pelo PostgREST, entao as funcoes nao sao
-- chamaveis via API; a revogacao e defesa em profundidade.
revoke all on function private.pode_iniciar(uuid, uuid) from public;
grant execute on function private.pode_iniciar(uuid, uuid) to authenticated;

-- Resposta em conversa existente: security definer evita
-- autorreferência de messages na própria policy (recursão).
create or replace function private.tem_conversa(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.messages m
    where (m.sender_id = a and m.receiver_id = b)
       or (m.sender_id = b and m.receiver_id = a)
  );
$$;

revoke all on function private.tem_conversa(uuid, uuid) from public;
grant execute on function private.tem_conversa(uuid, uuid) to authenticated;

-- Remetente precisa estar aprovado (decisao 2 do cabecalho: rejeitado
-- ou pendente nao envia, nem em conversa existente).
create or replace function private.remetente_ativo(a uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles s
    where s.id = a and s.verification_status = 'approved'
  );
$$;

revoke all on function private.remetente_ativo(uuid) from public;
grant execute on function private.remetente_ativo(uuid) to authenticated;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (select private.remetente_ativo((select auth.uid())))
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
