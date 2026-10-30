# Drafts de policy de mensagens (NAO APLICAR sem decisao da proprietaria)

Dependem da decisao "quem pode iniciar conversa". Estrutura comum:
- Resposta em conversa existente: sempre permitida para participantes (RLS ja limita leitura a participantes).
- Inicio de conversa (primeiro par): controlado por private.pode_iniciar(a, b).

Variantes:
- draft_A_inicio_somente_empresa.sql: so empresa aprovada inicia com profissional aprovado; profissional so responde.
- draft_B_inicio_ambos_papeis_opostos.sql: empresa<->profissional aprovados iniciam em ambas direcoes; exclui mesmo papel, admin e self.

Ambas preservam: spoof bloqueado (sender = auth.uid), self bloqueado, FK de destinatario.
