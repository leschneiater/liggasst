import { createContext, useContext } from 'react';

export interface Avisos {
  mensagensNovas: number;
  propostasPendentes: number;
  // true quando alguma leitura falhou: a tela nao pode afirmar "sem novidades".
  indisponivel: boolean;
}

export const SEM_AVISOS: Avisos = { mensagensNovas: 0, propostasPendentes: 0, indisponivel: false };
export const AvisosContext = createContext<Avisos>(SEM_AVISOS);

// Sem provider (ex.: telas de teste), nao ha avisos.
export const useAvisos = (): Avisos => useContext(AvisosContext);
