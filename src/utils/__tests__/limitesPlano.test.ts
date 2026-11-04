// Regras puras dos limites do plano gratuito (espelham a migration
// 20261104020000; o banco decide de verdade).
import { describe, expect, it } from 'vitest';
import {
  bloquearContatoNovo,
  bloquearNovaDemandaAtiva,
  LIMITE_CONTATOS_NOVOS_MES,
  LIMITE_DEMANDAS_ATIVAS,
  AVISO_LIMITES,
  MSG_LIMITE_CONTATOS,
  MSG_LIMITE_DEMANDAS,
} from '../limitesPlano';

describe('bloquearContatoNovo', () => {
  const base = {
    pago: false,
    papelRemetente: 'professional',
    papelDestino: 'company',
    conversaExiste: false,
    contatosNovosNoMes: 0,
  };

  it('bloqueia o 6o contato novo do mes no plano free', () => {
    expect(bloquearContatoNovo({ ...base, contatosNovosNoMes: LIMITE_CONTATOS_NOVOS_MES })).toBe(true);
    expect(bloquearContatoNovo({ ...base, contatosNovosNoMes: 99 })).toBe(true);
  });

  it('permite ate o 5o contato novo do mes no plano free', () => {
    expect(bloquearContatoNovo({ ...base, contatosNovosNoMes: LIMITE_CONTATOS_NOVOS_MES - 1 })).toBe(false);
    expect(bloquearContatoNovo(base)).toBe(false);
  });

  it('pagante nunca e bloqueado', () => {
    expect(bloquearContatoNovo({ ...base, pago: true, contatosNovosNoMes: 99 })).toBe(false);
  });

  it('responder conversa existente continua livre mesmo no limite', () => {
    expect(bloquearContatoNovo({ ...base, conversaExiste: true, contatosNovosNoMes: 99 })).toBe(false);
  });

  it('so limita inicio profissional -> empresa', () => {
    expect(bloquearContatoNovo({ ...base, papelRemetente: 'company', papelDestino: 'professional', contatosNovosNoMes: 99 })).toBe(false);
    expect(bloquearContatoNovo({ ...base, papelRemetente: 'professional', papelDestino: 'professional', contatosNovosNoMes: 99 })).toBe(false);
    expect(bloquearContatoNovo({ ...base, papelRemetente: null, contatosNovosNoMes: 99 })).toBe(false);
  });
});

describe('bloquearNovaDemandaAtiva', () => {
  it('bloqueia a 4a demanda ativa no plano free', () => {
    expect(bloquearNovaDemandaAtiva({ pago: false, demandasAtivas: LIMITE_DEMANDAS_ATIVAS })).toBe(true);
    expect(bloquearNovaDemandaAtiva({ pago: false, demandasAtivas: 10 })).toBe(true);
  });

  it('permite ate a 3a demanda ativa no plano free', () => {
    expect(bloquearNovaDemandaAtiva({ pago: false, demandasAtivas: LIMITE_DEMANDAS_ATIVAS - 1 })).toBe(false);
    expect(bloquearNovaDemandaAtiva({ pago: false, demandasAtivas: 0 })).toBe(false);
  });

  it('pagante nunca e bloqueado', () => {
    expect(bloquearNovaDemandaAtiva({ pago: true, demandasAtivas: 99 })).toBe(false);
  });
});

describe('textos do aviso no app', () => {
  it('avisos citam o limite e o plano pago', () => {
    expect(AVISO_LIMITES.certificados).toContain('5 certificados');
    expect(AVISO_LIMITES.contatos).toContain('5 contatos novos');
    expect(AVISO_LIMITES.demandas).toContain('3 demandas ativas');
    expect(MSG_LIMITE_CONTATOS).toContain('5 contatos novos');
    expect(MSG_LIMITE_DEMANDAS).toContain('3 demandas ativas');
  });

  it('aviso de contatos garante resposta livre', () => {
    expect(AVISO_LIMITES.contatos).toContain('Responder mensagens continua livre');
  });
});
