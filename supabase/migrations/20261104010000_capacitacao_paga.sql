-- Capacitacao exclusiva para assinantes pagos (decisao da dona em 03/11/2026,
-- WhatsApp: "A capacitação também é do programa pago").
--
-- 1) Helper private.plano_da_conta(uid): plano vigente da conta
--    ('pro_professional' | 'pro_company' | 'free'), com a MESMA janela de
--    acesso pago da policy radar_posts_select_pagantes: plano pro ativo, ou
--    cancelado/em atraso ainda dentro do periodo pago, e somente assinatura
--    de PRODUCAO (sandbox nunca libera acesso pago real).
-- 2) trainings_member_select passa a exigir plano pago, alem das regras
--    ja existentes (publicado, publico, is_test). Admin segue com
--    trainings_admin_all (ve e gerencia tudo).

create or replace function private.plano_da_conta(a uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.plan
    from public.subscriptions s
    where s.profile_id = a
      and s.plan in ('pro_professional', 'pro_company')
      and (
        s.status = 'active'
        or (s.status in ('canceled', 'past_due')
            and s.current_period_end >= current_date)
      )
      and s.environment = 'production'
    limit 1
  ), 'free');
$$;

revoke all on function private.plano_da_conta(uuid) from public;
grant execute on function private.plano_da_conta(uuid) to authenticated;

-- Membro aprovado E PAGANTE le publicados do proprio publico; is_test so para
-- perfil de teste. Conta gratuita nao le mais treinamentos.
drop policy if exists trainings_member_select on public.trainings;
create policy trainings_member_select on public.trainings for select to authenticated
  using (
    status = 'published'
    and private.plano_da_conta((select auth.uid())) <> 'free'
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
