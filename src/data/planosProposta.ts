// Fonte unica de planos para /planos e telas Minha Assinatura.
// Precos (39,90/99,90): confirmados pela dona do produto no WhatsApp em
// 01/11/2026 19:53 ("isso mesmo!"). BENEFICIOS: PROPOSTA em avaliacao
// (arquivo de proposta, geracao 10) - nada publicado, sujeito a revisao dela.

export interface PlanoProposta {
  id: string;
  nome: string;
  precoMensal: number; // 0 = gratuito
  recursos: string[];
  limites: string[];
}

export interface PropostaPublico {
  gratuito: PlanoProposta;
  pago: PlanoProposta;
  notaSempreGratuito: string;
}

export const PROPOSTA_PROFISSIONAL: PropostaPublico = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    precoMensal: 0,
    recursos: ['Perfil completo, vitrine, busca, mensagens, contratos e avaliações, como hoje'],
    limites: ['Limites propostos: certificados e contatos novos por mês (quantidades ainda em decisão; nada será restringido sem aprovação)'],
  },
  pago: {
    id: 'profissional',
    nome: 'Profissional',
    precoMensal: 39.9,
    recursos: [
      'Contatos novos e certificados sem limite fixo (uso razoável, contra abuso e spam)',
      'Perfil em destaque na busca (ainda a construir)',
    ],
    limites: [],
  },
  notaSempreGratuito: 'Responder a mensagens e demandas, receber propostas e ser avaliado continuam gratuitos sempre.',
};

export const PROPOSTA_EMPRESA: PropostaPublico = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    precoMensal: 0,
    recursos: ['Perfil, busca de profissionais, mensagens, contratos e avaliações, como hoje'],
    limites: ['Limite proposto de demandas ativas (quantidade ainda em decisão; nada será restringido sem aprovação)'],
  },
  pago: {
    id: 'empresa',
    nome: 'Empresa',
    precoMensal: 99.9,
    recursos: [
      'Demandas sem limite fixo (uso razoável)',
      'Empresa em destaque na vitrine (ainda a construir)',
    ],
    limites: [],
  },
  notaSempreGratuito: 'Buscar profissionais, responder mensagens e acompanhar demandas continuam gratuitos sempre.',
};
