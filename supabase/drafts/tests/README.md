# Testes locais de autorizacao (certificados)

`certificados-rls.test.mjs` sobe um Postgres real via PGlite (WASM, sem servidor)
com o mesmo schema, RLS e grants da migration `20260903190000_unify_supabase.sql`
(tabelas necessarias), aplica os drafts SQL desta pasta e executa uma matriz de
autorizacao como `role authenticated` com uids de papeis/status diferentes:

- RPC de metadados compartilhados: empresa aprovada/pendente/rejeitada,
  profissional aprovado/pendente, nao exposicao de storage_path;
- insert: status forcado e professional_id alheio bloqueados pela policy;
- update: toggle do dono ok; status e professional_id negados por grant de coluna;
  terceiros nao alteram; demonstracao do grant antigo de storage_path (fecha com o
  draft de revoke);
- delete: bloqueado sem o draft (grant + policy); com o draft, dono exclui (efeito
  verificado na mesma transacao) e dono errado afeta 0 linhas (frontend trata como
  erro e nao toca o storage);
- prefixo da Edge Function: caminho do dono aceito, caminho adulterado recusado.

## Rodar

```bash
cd supabase/drafts/tests
npm install
node certificados-rls.test.mjs
```

Saida esperada: `==== 21 PASS, 0 FAIL ====` (exit code 0). Requer Node 18+.
Dependencia unica: `@electric-sql/pglite` (dev, somente nesta pasta; nao entra no
app nem em producao).
