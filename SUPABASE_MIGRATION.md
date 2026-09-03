# Migração para Supabase

## Antes de aplicar

1. Faça backup do projeto Supabase atual.
2. Confirme que `VITE_SUPABASE_URL` aponta para o projeto correto.
3. Mantenha Email/Password e confirmação de e-mail habilitados.
4. Cadastre as URLs `/auth/callback` e `/auth/reset-password` em Auth > URL Configuration.

## Aplicação

Execute a migration versionada:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Depois, rode o Security Advisor no painel do Supabase e confirme que todas as
tabelas de `public` estão com RLS habilitado.

## Contas existentes

A migration reaproveita contas que já estiverem no Supabase Auth e cria os
registros ausentes em `profiles`, `professionals` ou `companies`.

Senhas do Firebase não devem e normalmente não podem ser copiadas para o
Supabase. Se existirem usuários reais no Firebase, faça uma migração controlada:

1. importe apenas identidade e dados de perfil por processo server-side;
2. nunca exporte senhas em texto aberto;
3. envie um convite de recuperação de senha pelo Supabase;
4. só desative o Firebase depois que as contas forem validadas;
5. registre consentimento, data da migração e resultado para fins de LGPD.

## Administradores

O navegador não pode criar nem promover administradores. Para promover uma conta,
use o SQL Editor com uma sessão administrativa ou uma função server-side protegida:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DA_CONTA';
```

Revise o UUID e o e-mail antes de executar. Não exponha uma operação equivalente
ao cliente web.

## Validação mínima

- cadastrar um profissional e confirmar o e-mail;
- cadastrar uma empresa e confirmar o e-mail;
- confirmar redirecionamento para dashboards distintos;
- testar recuperação e troca de senha;
- tentar ler e alterar o perfil de outro usuário e confirmar a negação;
- tentar enviar `role=admin` no cadastro e confirmar que o perfil não vira admin;
- validar que fotos e documentos exigem URL assinada;
- testar logout e expiração da sessão.
