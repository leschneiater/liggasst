import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useMessagingDisponivel } from '../hooks/useMessagingDisponivel';
import { fetchMessages, listarContratos } from '../services/database';
import { AvisosContext, SEM_AVISOS, type Avisos } from './AvisosContext';
import { contarMensagensNaoLidas, contarPropostasParaResponder } from '../utils/avisos';

// Aviso so para quem esta logado como empresa ou profissional. Consulta o que
// o app ja consulta (mensagens e contratos do proprio usuario, sob as mesmas
// regras de acesso do banco). Erro de leitura nao gera aviso falso: mantem o
// ultimo valor. Atualiza ao trocar de pagina, ao voltar para a aba e a cada
// 30 s com a aba visivel.
export const AvisosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userType } = useAuth();
  const { disponivel: mensagensDisponivel } = useMessagingDisponivel();
  const location = useLocation();
  const [avisos, setAvisos] = useState<Avisos>(SEM_AVISOS);
  const meuId = currentUser?.id ?? '';
  const papel = userType === 'company' ? 'empresa' : userType === 'professional' ? 'profissional' : null;

  const atualizar = useCallback(async () => {
    if (!meuId || !papel) return;
    const [msgs, contratos] = await Promise.allSettled([
      mensagensDisponivel ? fetchMessages() : Promise.resolve(null),
      papel === 'profissional' ? listarContratos() : Promise.resolve([]),
    ]);
    setAvisos((anterior) => {
      let { mensagensNovas, propostasPendentes } = anterior;
      if (!mensagensDisponivel) mensagensNovas = 0;
      else if (msgs.status === 'fulfilled' && msgs.value && msgs.value.success && Array.isArray(msgs.value.data)) {
        mensagensNovas = contarMensagensNaoLidas(msgs.value.data, meuId);
      }
      if (papel !== 'profissional') propostasPendentes = 0;
      else if (contratos.status === 'fulfilled') {
        propostasPendentes = contarPropostasParaResponder(contratos.value, papel);
      }
      return { mensagensNovas, propostasPendentes };
    });
  }, [meuId, papel, mensagensDisponivel]);

  useEffect(() => {
    if (!meuId || !papel) { setAvisos(SEM_AVISOS); return; }
    atualizar();
  }, [atualizar, meuId, papel, location.pathname]);

  useEffect(() => {
    if (!meuId || !papel) return;
    const quandoVisivel = () => { if (document.visibilityState === 'visible') atualizar(); };
    const t = setInterval(quandoVisivel, 30000);
    document.addEventListener('visibilitychange', quandoVisivel);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', quandoVisivel); };
  }, [atualizar, meuId, papel]);

  const valor = useMemo(() => avisos, [avisos]);
  return <AvisosContext.Provider value={valor}>{children}</AvisosContext.Provider>;
};
