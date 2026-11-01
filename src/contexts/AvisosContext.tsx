import { createContext, useContext } from 'react';

export interface Avisos {
  mensagensNovas: number;
  propostasPendentes: number;
}

export const SEM_AVISOS: Avisos = { mensagensNovas: 0, propostasPendentes: 0 };
export const AvisosContext = createContext<Avisos>(SEM_AVISOS);

// Sem provider (ex.: telas de teste), nao ha avisos.
export const useAvisos = (): Avisos => useContext(AvisosContext);
