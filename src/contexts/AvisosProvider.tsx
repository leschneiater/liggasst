import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useMessagingDisponivel } from '../hooks/useMessagingDisponivel';
import { fetchMessages, fetchMyBlocks, listarContratos } from '../services/database';
import { AvisosContext, SEM_AVISOS, type Avisos } from './AvisosContext';
import { contarMensagensNaoLidas, contarPropostasParaResponder, type MensagemAviso } from '../utils/avisos';

// Intervalo minimo entre leituras disparadas por voltar para a aba. Trocar de
// pagina sempre le (e uma acao da pessoa, como abrir uma tela). Nao ha leitura
// em intervalo fixo.
const MIN_MS_ENTRE_LEITURAS_AO_VOLTAR = 60_000;

// Aviso so para quem esta logado como empresa ou profissional. Consulta o que
// o app ja consulta (mensagens, bloqueios e contratos do proprio usuario, sob
// as mesmas regras de acesso do banco). Regras de seguranca da exibicao:
// - ao sair ou trocar de conta/papel, zera na hora e descarta respostas que
//   chegam atrasadas da conta anterior;
// - falha de leitura nao mostra numero antigo: aquela fonte volta a zero.
export const AvisosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userType } = useAuth();
  const { disponivel: mensagensDisponivel } = useMessagingDisponivel();
  const location = useLocation();
  const [avisos, setAvisos] = useState<Avisos>(SEM_AVISOS);
  const meuId = currentUser?.id ?? '';
  const papel = userType === 'company' ? 'empresa' : userType === 'professional' ? 'profissional' : null;
  const chave = meuId && papel ? `${meuId}:${papel}:${mensagensDisponivel ? 1 : 0}` : '';
  const chaveAtual = useRef(chave);
  const ultimaLeitura = useRef(0);
  chaveAtual.current = chave;

  const atualizar = useCallback(async () => {
    if (!meuId || !papel) return;
    const minhaChave = `${meuId}:${papel}:${mensagensDisponivel ? 1 : 0}`;
    ultimaLeitura.current = Date.now();
    const [msgs, bloqueios, contratos] = await Promise.allSettled([
      mensagensDisponivel ? fetchMessages() : Promise.resolve(null),
      mensagensDisponivel ? fetchMyBlocks() : Promise.resolve(null),
      papel === 'profissional' ? listarContratos() : Promise.resolve([]),
    ]);
    // Resposta de outra conta, outro papel ou de antes do logout: descarta.
    if (chaveAtual.current !== minhaChave) return;

    let mensagensNovas = 0;
    if (mensagensDisponivel) {
      const msgsOk = msgs.status === 'fulfilled' && msgs.value && msgs.value.success && Array.isArray(msgs.value.data);
      const blqOk = bloqueios.status === 'fulfilled' && bloqueios.value && bloqueios.value.success;
      if (msgsOk && blqOk) {
        const ids = new Set((bloqueios.value as { data: { blocked_id: string }[] }).data.map((b) => b.blocked_id));
        mensagensNovas = contarMensagensNaoLidas((msgs.value as unknown as { data: MensagemAviso[] }).data, meuId, ids);
      }
    }
    const propostasPendentes = papel === 'profissional' && contratos.status === 'fulfilled'
      ? contarPropostasParaResponder(contratos.value, papel)
      : 0;
    setAvisos((anterior) =>
      anterior.mensagensNovas === mensagensNovas && anterior.propostasPendentes === propostasPendentes
        ? anterior
        : { mensagensNovas, propostasPendentes });
  }, [meuId, papel, mensagensDisponivel]);

  // Zera na hora quando a identidade muda (logout, outra conta, outro papel).
  useEffect(() => {
    setAvisos(SEM_AVISOS);
  }, [meuId, papel]);

  // Le ao entrar e a cada troca de pagina.
  useEffect(() => {
    if (!chave) return;
    atualizar();
  }, [atualizar, chave, location.pathname]);

  // Ao voltar para a aba, le de novo, no maximo uma vez por minuto.
  useEffect(() => {
    if (!chave) return;
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultimaLeitura.current < MIN_MS_ENTRE_LEITURAS_AO_VOLTAR) return;
      atualizar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [atualizar, chave]);

  const valor = useMemo(() => avisos, [avisos]);
  return <AvisosContext.Provider value={valor}>{children}</AvisosContext.Provider>;
};
