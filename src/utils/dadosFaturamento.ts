// Dados de faturamento (CPF/CNPJ, celular e endereco) coletados no cadastro
// e pre-preenchidos na tela de assinatura (desde 05/11). As mesmas
// validacoes valem no formulario de cadastro, na conclusao de conta social
// e na RPC completar_cadastro (espelhadas no banco).
export interface DadosFaturamento {
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  province: string;
}

export const digitos = (valor: string): string => valor.replace(/\D/g, '');

export const validarCpfCnpj = (valor: string, papel: 'professional' | 'company'): string | null => {
  const d = digitos(valor);
  if (papel === 'professional') return d.length === 11 ? null : 'CPF deve ter 11 dígitos';
  return d.length === 14 ? null : 'CNPJ deve ter 14 dígitos';
};

export const validarCep = (valor: string): string | null =>
  digitos(valor).length === 8 ? null : 'CEP deve ter 8 dígitos';

export const validarCelular = (valor: string): string | null => {
  const d = digitos(valor);
  return d.length >= 10 && d.length <= 11 ? null : 'Celular deve ter DDD + número';
};

export type FormFaturamento = { nome: string; email: string } & DadosFaturamento;

// Pre-preenche o formulario da assinatura com os dados guardados na conta.
// Campos ja digitados pelo usuario NUNCA sao sobrescritos.
export const preencherFormFaturamento = (
  form: FormFaturamento,
  dados: Partial<FormFaturamento>
): FormFaturamento => {
  const proximo = { ...form };
  (Object.keys(dados) as (keyof FormFaturamento)[]).forEach((campo) => {
    const valor = dados[campo];
    if (typeof valor === 'string' && valor !== '' && proximo[campo] === '') {
      proximo[campo] = valor;
    }
  });
  return proximo;
};
