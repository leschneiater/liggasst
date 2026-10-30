# Rascunhos de políticas de mensagens — NÃO APLICAR em produção

Registro das variantes discutidas/preparadas. Apenas o que estiver em
supabase/migrations/ com aprovação explícita de publicação será aplicado.

- draft_A_inicio_somente_empresa.sql — variante A (só empresa inicia).
  SUPERADA pela decisão da usuária de 30/10/2026 ("ambos podem iniciar").
- draft_B_inicio_ambos_papeis_opostos.sql — variante B, ESCOLHIDA;
  espelho da migração preparada 20261030130000.
- draft_C_resposta_exige_aprovado.sql — APROVADA pela usuária em
  30/10/2026 09:29 ("perfeito! gostei da sugestão. podemos seguir") e
  CONSOLIDADA na migração preparada 20261030130000 (remetente_ativo).
  Mantido como registro.
- draft_D_bloqueio_usuarios.sql — APROVADA 30/10/2026 09:29:56 ("sim!"
  à proposta Bloquear+Denunciar); promovida à migração preparada
  20261030140000. OPÇÃO original: bloqueio bilateral entre
  usuários (conversation_blocks). Validado localmente (D1/D2 bloqueiam
  ambos os sentidos, D3 controle, D4 bloqueado não vê bloqueios,
  D5 desbloqueio restaura).
- draft_E_denuncia.sql — APROVADA 30/10/2026 09:29:56 (mesmo "sim!");
  promovida à migração preparada 20261030140000. OPÇÃO original:
  denúncia para revisão da administração
  (message_reports, mínimo sem UI de moderação). Validado localmente
  (E1 cria, E2 terceiro não vê denúncia alheia).

Combinação: D e E são independentes entre si; C altera a mesma policy
messages_insert — se aprovadas juntas, consolidar em uma única migração.
