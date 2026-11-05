import { describe, it, expect } from 'vitest';
import { digitos, validarCpfCnpj, validarCep, validarCelular, preencherFormFaturamento } from '../dadosFaturamento';

describe('dadosFaturamento', () => {
  it('digitos remove tudo que nao e numero', () => {
    expect(digitos('(11) 98765-4321')).toBe('11987654321');
    expect(digitos('12.345.678/0001-90')).toBe('12345678000190');
  });

  it('validarCpfCnpj exige 11 digitos para profissional', () => {
    expect(validarCpfCnpj('123.456.789-00', 'professional')).toBeNull();
    expect(validarCpfCnpj('12345678000190', 'professional')).not.toBeNull();
    expect(validarCpfCnpj('123', 'professional')).not.toBeNull();
  });

  it('validarCpfCnpj exige 14 digitos para empresa', () => {
    expect(validarCpfCnpj('12.345.678/0001-90', 'company')).toBeNull();
    expect(validarCpfCnpj('12345678900', 'company')).not.toBeNull();
  });

  it('validarCep exige 8 digitos', () => {
    expect(validarCep('01310-100')).toBeNull();
    expect(validarCep('0131')).not.toBeNull();
  });

  it('validarCelular aceita DDD + numero (10 ou 11 digitos)', () => {
    expect(validarCelular('(11) 98765-4321')).toBeNull();
    expect(validarCelular('(11) 3456-7890')).toBeNull();
    expect(validarCelular('987654321')).not.toBeNull();
    expect(validarCelular('(11) 998765-43210')).not.toBeNull();
  });

  it('preencherFormFaturamento preenche vazios e nunca sobrescreve digitado', () => {
    const vazio = { nome: '', email: '', cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '' };
    const dados = { nome: 'Ana', email: 'ana@x.com', cpfCnpj: '12345678900', phone: '11987654321', postalCode: '01310100', address: 'Av. Paulista', addressNumber: '1000', province: 'Bela Vista' };
    expect(preencherFormFaturamento(vazio, dados)).toEqual(dados);

    const digitado = { ...vazio, cpfCnpj: '00000000000', address: 'Rua Digitada' };
    const mesclado = preencherFormFaturamento(digitado, dados);
    expect(mesclado.cpfCnpj).toBe('00000000000');
    expect(mesclado.address).toBe('Rua Digitada');
    expect(mesclado.phone).toBe('11987654321');
  });

  it('preencherFormFaturamento ignora valores vazios da conta', () => {
    const vazio = { nome: '', email: '', cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '' };
    expect(preencherFormFaturamento(vazio, { nome: 'Ana', cpfCnpj: '' })).toEqual({ ...vazio, nome: 'Ana' });
  });
});
