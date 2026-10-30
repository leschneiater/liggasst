-- ============================================================
-- PREPARAÇÃO REVERSÍVEL — NÃO APLICAR EM PRODUÇÃO sem aprovação
-- de publicação da Letícia.
-- Decisão de produto (Letícia, WhatsApp 30/10/2026 09:21):
-- "ambos podem iniciar a conversa" (empresa e profissional).
-- Esta migração separa INÍCIO de conversa de RESPOSTA:
--  - Resposta em conversa existente: sempre permitida ao
--    participante (como hoje).
--  - Início de conversa nova: apenas entre papéis opostos
--    (empresa <-> profissional) e ambos aprovados.
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

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and receiver_id <> (select auth.uid())
  and (
    (select private.tem_conversa((select auth.uid()), messages.receiver_id))
    or (select private.pode_iniciar((select auth.uid()), messages.receiver_id))
  )
);
