// Helpers puros da capacitacao da equipe (feature 3 do plano Empresa pago).
import type { AtribuicaoTreinamento, FuncionarioEquipe } from '../services/capacitacaoEquipe';

export const rotuloStatusAtribuicao = (status: AtribuicaoTreinamento['status']): string =>
  status === 'completed' ? 'Concluído' : 'Pendente';

// Vinculo do funcionario com a conta propria na plataforma.
export const rotuloVinculo = (f: Pick<FuncionarioEquipe, 'active' | 'employee_profile_id'>): string => {
  if (!f.active) return 'Desativado';
  return f.employee_profile_id ? 'Conta vinculada' : 'Convite pendente';
};

export interface ProgressoEquipe {
  total: number;
  concluidos: number;
  percentual: number; // 0-100, inteiro; 0 quando nao ha atribuicoes
}

export const progressoDaEquipe = (
  atribuicoes: Pick<AtribuicaoTreinamento, 'status'>[],
): ProgressoEquipe => {
  const total = atribuicoes.length;
  const concluidos = atribuicoes.filter((a) => a.status === 'completed').length;
  return {
    total,
    concluidos,
    percentual: total === 0 ? 0 : Math.round((concluidos / total) * 100),
  };
};

// Atribuicoes de um funcionario especifico (linha company_employees).
export const atribuicoesDoFuncionario = (
  atribuicoes: AtribuicaoTreinamento[],
  companyEmployeeId: string,
): AtribuicaoTreinamento[] =>
  atribuicoes.filter((a) => a.company_employee_id === companyEmployeeId);
