# LiggaSST

Plataforma que conecta empresas e profissionais de Segurança e Saúde no Trabalho.

## Arquitetura

- React, TypeScript e Vite no frontend.
- Supabase Auth para cadastro, confirmação de e-mail, sessão e recuperação de senha.
- Supabase PostgreSQL para todos os dados da aplicação.
- Supabase Storage em buckets privados para fotos e documentos.
- Row Level Security (RLS) para isolamento de dados por usuário e papel.

Firebase e conexões diretas a bancos não fazem parte da arquitetura.

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Copie `.env.example` para `.env` e informe apenas as configurações públicas:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_publica
   ```

   Nunca coloque `service_role`, senha de banco ou chave privada em uma variável
   `VITE_*`. Tudo que começa com `VITE_` é incluído no bundle do navegador.

3. Aplique a migration:

   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```

   Como alternativa, execute
   `supabase/migrations/20260903190000_unify_supabase.sql` no SQL Editor.

4. No painel Supabase, em Authentication:

   - habilite Email/Password;
   - mantenha a confirmação de e-mail obrigatória;
   - configure `https://liggasst.com.br` como Site URL;
   - adicione `/auth/callback` e `/auth/reset-password` às Redirect URLs;
   - configure SMTP próprio antes de abrir cadastros em produção;
   - defina política de senha com no mínimo 10 caracteres.

5. Inicie o projeto:

   ```bash
   npm run dev
   ```

## Banco de dados

A migration cria:

- `profiles`: identidade, papel e dados comuns;
- `professionals`: dados privados do profissional;
- `companies`: dados privados da empresa;
- `demands`: demandas publicadas por empresas;
- `contracts`: contratos entre empresas e profissionais;
- `messages`: mensagens entre participantes;
- `certificates`: documentos e certificados profissionais;
- funções seguras de busca com exclusão de CPF, CNPJ, endereço e contatos privados;
- buckets privados `profile-images` e `documents`.

O papel inicial só pode ser `professional` ou `company`. O trigger de cadastro
ignora qualquer tentativa do navegador de criar um administrador. Contas admin
devem ser promovidas por uma operação administrativa server-side.

## Verificações

Execute antes de enviar mudanças:

```bash
npm run check:secrets
npm run check:architecture
npm run typecheck
npm run build
```

O workflow `Security CI` executa as mesmas verificações em pull requests e pushes
na `main`.

## Segurança

Consulte [SECURITY.md](SECURITY.md) para reportar vulnerabilidades. As regras RLS
são a autorização efetiva; os componentes de rota no frontend servem apenas para
experiência de navegação.
