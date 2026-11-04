// Fonte unica de planos para /planos e telas Minha Assinatura.
// Condicoes aprovadas em 01/11/2026 (precos 39,90/99,90; gratuito profissional
// 5 certificados visiveis e 5 contatos novos por mes; gratuito empresa 3
// demandas ativas; pago sem limite fixo e com destaque). PREVISTAS para o
// lancamento dos planos pagos: AINDA NAO APLICADAS. Falta aprovar a transicao
// para usuarios existentes; ate la nada e restringido nem cobrado.

export const AVISO_PLANOS_PAGOS =
  'Os planos pagos estão disponíveis para assinatura: Profissional R$ 39,90/mês e Empresa R$ 99,90/mês. Nenhum limite é aplicado ao plano gratuito.';
export const TEXTO_LIMITES_NAO_APLICADOS = 'previsto para o lançamento dos planos pagos, ainda não aplicado';

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
    limites: [
      'Até 5 certificados visíveis e 5 contatos novos por mês (' + TEXTO_LIMITES_NAO_APLICADOS + ')',
      'Com anúncios',
    ],
  },
  pago: {
    id: 'profissional',
    nome: 'Profissional',
    precoMensal: 39.9,
    recursos: [
      'Contatos novos e certificados sem limite fixo (uso razoável, contra abuso e spam)',
      'Radar TST: conteúdo exclusivo para assinantes',
      'Capacitação em SST',
      'Sem anúncios',
      'Perfil em destaque na busca',
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
    limites: [
      'Até 3 demandas ativas (' + TEXTO_LIMITES_NAO_APLICADOS + ')',
      'Com anúncios',
    ],
  },
  pago: {
    id: 'empresa',
    nome: 'Empresa',
    precoMensal: 99.9,
    recursos: [
      'Demandas sem limite fixo (uso razoável)',
      'Comparador de propostas lado a lado',
      'Calendário de conformidade',
      'Capacitação da equipe',
      'Radar TST: conteúdo exclusivo para assinantes',
      'Sem anúncios',
      'Empresa em destaque na vitrine',
    ],
    limites: [],
  },
  notaSempreGratuito: 'Buscar profissionais, responder mensagens e acompanhar demandas continuam gratuitos sempre.',
};
