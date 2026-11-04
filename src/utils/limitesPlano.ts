// Limites do plano gratuito (condicoes aprovadas em 01/11 e ligadas por
// decisao da dona em 03/11/2026, com aviso no app): profissional free tem
// ate 5 certificados visiveis e 5 contatos novos por mes; empresa free tem
// ate 3 demandas ativas. Pagante (assinaturaPagaAtiva) nao tem limite fixo.
// As funcoes puras abaixo ESPELHAM a regra do banco (migration
// 20261104020000): o banco decide de verdade (RLS/trigger); o cliente usa
// as mesmas contas so para avisar antes e explicar o bloqueio.
export const LIMITE_CERTIFICADOS_VISIVEIS = 5;
export const LIMITE_CONTATOS_NOVOS_MES = 5;
export const LIMITE_DEMANDAS_ATIVAS = 3;

export interface EntradaContatoNovo {
  pago: boolean;
  papelRemetente: string | null;
  papelDestino: string | null;
  conversaExiste: boolean;
  contatosNovosNoMes: number;
}

// Espelha private.contato_novo_liberado: so bloqueia INICIO de conversa
// profissional -> empresa no plano free; responder continua livre.
export function bloquearContatoNovo(e: EntradaContatoNovo): boolean {
  if (e.pago) return false;
  if (e.papelRemetente !== 'professional' || e.papelDestino !== 'company') return false;
  if (e.conversaExiste) return false;
  return e.contatosNovosNoMes >= LIMITE_CONTATOS_NOVOS_MES;
}

// Espelha private.empresa_pode_ativar_demanda: rascunho nao conta;
// concluida/cancelada libera espaco.
export function bloquearNovaDemandaAtiva(opts: { pago: boolean; demandasAtivas: number }): boolean {
  if (opts.pago) return false;
  return opts.demandasAtivas >= LIMITE_DEMANDAS_ATIVAS;
}

// Avisos do app (texto visivel nas telas afetadas).
export const AVISO_LIMITES = {
  certificados:
    'Plano gratuito: até 5 certificados ficam visíveis para as empresas (os 5 mais recentes). Seus arquivos continuam salvos. Com um plano pago, todos ficam visíveis.',
  contatos:
    'Plano gratuito: até 5 contatos novos por mês. Responder mensagens continua livre. Com um plano pago, contatos sem limite fixo.',
  demandas:
    'Plano gratuito: até 3 demandas ativas por vez. Concluir ou cancelar uma demanda libera espaço. Com um plano pago, demandas sem limite fixo.',
} as const;

export const MSG_LIMITE_CONTATOS =
  'Você atingiu o limite de 5 contatos novos por mês do plano gratuito. Responder mensagens continua livre; para iniciar contatos sem limite fixo, veja os planos pagos.';
export const MSG_LIMITE_DEMANDAS =
  'Você atingiu o limite de 3 demandas ativas do plano gratuito. Conclua ou cancele uma demanda para liberar espaço, ou veja os planos pagos para demandas sem limite fixo.';
