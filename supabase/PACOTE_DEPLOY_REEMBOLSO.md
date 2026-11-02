# Pacote de implantacao controlada — reembolsos (proposta para decisao futura)

NAO EXECUTAR sem autorizacao da usuaria. Natureza: ALTERACAO DE PRODUCAO com
billing ainda em sandbox. NAO e homologacao. Nenhuma cobranca real: o switch
ASAAS_COBRANCAS_PRODUCAO_ATIVAS permanece ausente e as vendas seguem fechadas.

## Alteracoes exatas
1. Banco (producao, ilvrcozeqbdgeuzjgpvf): aplicar a migration
   20261102130000_reembolso_pedidos.sql — cria a tabela NOVA reembolso_pedidos
   (RLS: cliente le/insere o proprio; admin tudo; indice unico parcial de 1
   pedido ativo por cobranca). Aditiva: nao altera tabelas, politicas ou dados
   existentes.
2. Edge functions (producao):
   - asaas-reembolso: deploy NOVO (nao existe em producao; nada substituido).
   - asaas-webhook: SUBSTITUICAO — a versao em producao processa assinaturas
     sandbox hoje; a nova versao mantem esse comportamento (coberto pela
     suite, 109/109 em utils) e ADICIONA a sincronizacao de reembolso_pedidos
     nos eventos PAYMENT_REFUNDED / PAYMENT_PARTIALLY_REFUNDED /
     PAYMENT_REFUND_IN_PROGRESS / PAYMENT_REFUND_DENIED (hoje nao emitidos,
     pois nenhum estorno e iniciado).
   - Registrar o commit exato da versao em producao antes do deploy.
3. Segredos/config: nenhum segredo novo em producao; functions usam a chave e
   o token de SANDBOX ja existentes. Chave de producao continua fora do
   backend.
4. Frontend: publicar no site oficial a aba /admin/reembolsos e o botao de
   solicitar reembolso no StatusPlano (processo ja usado: worktree limpo, PAT
   temporario repo-only, auditoria linha a linha, Actions -> GitHub Pages).
   A aba so aparece para a conta admin (rota protegida); o botao so aparece
   com plano pago ativo (hoje so sandbox/allowlist).

## Isolamento de dados de teste
- Testes usam a conta admin/allowlist e cobrancas SANDBOX; os pedidos levam
  environment='sandbox' e o asaas_payment_id de sandbox. Nenhum dado de
  cliente real e necessario.
- Qualquer tentativa de estorno em modo producao falha fechado (switch
  ausente). Estornos de teste acontecem SOMENTE no Asaas sandbox (dinheiro
  ficticio).

## Protecao do webhook existente
- O webhook Asaas sandbox ligga-subscription-d1 (-> producao) NAO e repontado
  nem alterado; mesmos 8 eventos, mesma URL. A validacao de renovacao de
  03/11 e os demais fluxos sandbox seguem intactos.
- Se um dia houver ambiente separado, o Asaas permite ate 10 webhooks por
  conta: um novo endpoint seria ADICIONADO, nunca repontado.

## Rollback (nao destrutivo)
- Functions: re-deploy da versao anterior a partir do commit registrado.
- Frontend: revert do commit de publicacao.
- Tabela reembolso_pedidos: DROP TABLE SOMENTE se comprovadamente vazia ou sem
  nenhum registro que deva ser preservado (verificar count e conteudo antes).
  Se houver qualquer registro: exportar e preservar (pg_dump da tabela para
  arquivo) e PREFERIR desabilitar a funcionalidade (remover a aba/rotas e a
  function) mantendo a tabela e os dados, em vez de apagar.

## Risco verificado: webhook de renovacao
A suite local NAO garante que o webhook de renovacao em producao fica intacto
apos o deploy da nova asaas-webhook. Tratamento obrigatorio:
- ANTES do deploy: registrar a configuracao atual via API (GET /v3/webhooks no
  sandbox: id, URL, enabled, eventos) e o estado da assinatura sandbox
  (1591776) para comparacao.
- DEPOIS do deploy: re-ler a configuracao do webhook (inalterada), disparar/
  acompanhar um evento sandbox qualquer e confirmar entrega HTTP 200 e
  processamento (log da function), e confirmar que a assinatura sandbox
  continua com os mesmos dados (period_end etc.).
- Se qualquer verificacao falhar: rollback imediato da function (re-deploy da
  versao anterior) e reporte; a validacao de renovacao de 03/11 tem prioridade
  e nao pode ser comprometida.

## O que valida sem dinheiro real
Fluxo completo no sandbox Asaas: cobranca com cartao de teste, pedido do
cliente pela UI, aprovacao admin com estorno no sandbox, sincronizacao via
webhook, recusa com motivo, dupla aprovacao bloqueada pelo claim atomico,
RLS (cliente nao ve pedido alheio), 403 para nao-admin com JWT real.

## O que NAO valida
Comportamento com cobranças e estornos de producao; isso continua proibido
sem aprovacao por pedido, com valor e cobranca identificados.

## Autorizacao necessaria (uma decisao, escopo fechado)
"Pode publicar no site e no backend oficiais o fluxo de reembolso, ainda sem
cobrancas reais: uma tabela nova, duas functions e a aba admin; estornos
apenas na simulacao do Asaas."

## Pacote minimo (branch minimo-reembolso, base origin/main 6b758e7)
Arquivos: migration 20261102130000_reembolso_pedidos.sql; functions/asaas-reembolso
(index fixo em SANDBOX, sem _shared/asaas-env); functions/asaas-webhook = codigo
LIVE lido do dashboard em 02/11 + 1 bloco em handler.ts (sync de
reembolso_pedidos nos eventos de estorno); index.ts e decide.ts do webhook
IDENTICOS ao live (sem roteamento de producao); frontend = SOMENTE aba admin
/admin/reembolsos (+ item de menu, + servico). O botao de solicitar no cliente
(StatusPlano) NAO entra: depende do WIP de pagamento nao publicado; testes
sandbox criam o pedido via SQL na conta de teste.
Fora do pacote: migrations planos_destaque/busca_vitrine_destaque/planos_limites,
_shared/asaas-env.ts, Planos/Assinatura*, checkout/conciliador/atualizar-cartao.
Ordem de deploy: migration -> asaas-reembolso -> asaas-webhook -> frontend.
Rollback: re-deploy do snapshot live do webhook (guardado), remover asaas-reembolso,
desabilitar aba (revert do commit); tabela so se vazia, senao preservar.
Verificado local: vitest 216/216 (34 arquivos), tsc 58 erros com o MESMO conjunto
de erros do main, PGlite reembolso 18/0, assinatura 14/0, radar 13/0.
Nao verificado: execucao remota; entrega real do webhook; Auth real.

## Revisao de auditoria (02/11, pos-recuperacao)
- Migration corrigida: a policy de insert anterior deixava a conta pedir
  reembolso de cobranca de TERCEIROS e preencher decided_by/detalhe (provado
  por teste PGlite contra a versao antiga: 5 falhas). Agora exige cobranca
  propria e paga (funcao private.cobranca_pertence_a_conta, security definer)
  e campos de decisao nulos. Teste: supabase/tests/reembolso_pedidos_policy.test.mjs.
- Escopo minimo: SOMENTE 20261102130000_reembolso_pedidos.sql. NAO incluir
  20261102100000_planos_destaque, 20261102110000_busca_vitrine_destaque,
  20261102120000_planos_limites (limites/destaque, decisao separada).
- (Superado pelo pacote minimo acima: sem _shared/asaas-env.) Antes: asaas-reembolso e asaas-webhook importavam
  functions/_shared/asaas-env.ts (roteamento). Sem ASAAS_ENV definido ele
  resolve SANDBOX com ASAAS_API_KEY/ASAAS_WEBHOOK_TOKEN existentes (mesmo
  comportamento atual). Producao so com ASAAS_ENV=production + chave dedicada,
  que nao existe no backend. Deploy do arquivo compartilhado NAO ativa nada.
- Nao verificado: a versao de asaas-webhook hoje em producao e igual a base
  desta arvore (precisa comparar com o codigo implantado antes de substituir).
