// Aviso de proporcao da arte do carrossel (pedido dela 04/11): o admin
// ve o tamanho ideal no upload e um aviso quando a arte foge do 4:1.
import { describe, expect, it } from 'vitest';
import { AD_ARTE_IDEAL, erroProporcaoArte, erroProporcaoCapa } from '../adsFormat';

describe('erroProporcaoArte', () => {
  it('aceita a proporcao ideal 4:1', () => {
    expect(erroProporcaoArte(1600, 400)).toBeNull();
    expect(erroProporcaoArte(1200, 300)).toBeNull();
  });
  it('aceita dentro da tolerancia', () => {
    expect(erroProporcaoArte(AD_ARTE_IDEAL.proporcao * 1.14 * 100, 100)).toBeNull();
    expect(erroProporcaoArte(AD_ARTE_IDEAL.proporcao * 0.86 * 100, 100)).toBeNull();
  });
  it('bloqueia quando a arte e estreita demais', () => {
    const erro = erroProporcaoArte(800, 400); // 2:1
    expect(erro).toContain('2:1');
    expect(erro).toContain('4:1');
    expect(erro).toContain('1600×400');
    expect(erro).toContain('não pode ser usada');
  });
  it('bloqueia quando a arte e larga demais', () => {
    expect(erroProporcaoArte(2000, 100)).toContain('20:1');
  });
  it('ignora dimensoes invalidas', () => {
    expect(erroProporcaoArte(0, 400)).toBeNull();
    expect(erroProporcaoArte(1600, 0)).toBeNull();
  });
});

describe('erroProporcaoCapa (Radar, 1200x630)', () => {
  it('aceita a proporcao ideal 1200x630', () => {
    expect(erroProporcaoCapa(1200, 630)).toBeNull();
    expect(erroProporcaoCapa(600, 315)).toBeNull();
  });
  it('bloqueia fora da proporcao e cita 1200x630', () => {
    const erro = erroProporcaoCapa(800, 800); // 1:1
    expect(erro).toContain('1:1');
    expect(erro).toContain('1200×630');
    expect(erro).toContain('capa');
  });
});
