// Aviso dos limites do plano gratuito: so aparece para conta free e traz
// o texto do tipo certo com link para /planos.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AvisoLimitesPlano from '../AvisoLimitesPlano';

const renderizar = (tipo: 'certificados' | 'contatos' | 'demandas', pago: boolean) =>
  render(
    <MemoryRouter>
      <AvisoLimitesPlano tipo={tipo} pago={pago} />
    </MemoryRouter>,
  );

describe('AvisoLimitesPlano', () => {
  it('nao renderiza nada para conta paga', () => {
    const { container } = renderizar('contatos', true);
    expect(container.firstChild).toBeNull();
  });

  it('mostra o aviso de certificados para conta free', () => {
    renderizar('certificados', false);
    expect(screen.getByTestId('aviso-limite-certificados')).toBeTruthy();
    expect(screen.getByText(/5 certificados/)).toBeTruthy();
    expect(screen.getByText('Ver planos')).toBeTruthy();
  });

  it('mostra o aviso de contatos para conta free', () => {
    renderizar('contatos', false);
    expect(screen.getByTestId('aviso-limite-contatos')).toBeTruthy();
    expect(screen.getByText(/5 contatos novos/)).toBeTruthy();
  });

  it('mostra o aviso de demandas para conta free', () => {
    renderizar('demandas', false);
    expect(screen.getByTestId('aviso-limite-demandas')).toBeTruthy();
    expect(screen.getByText(/3 demandas ativas/)).toBeTruthy();
  });

  it('link do aviso aponta para /planos', () => {
    renderizar('contatos', false);
    const link = screen.getByText('Ver planos').closest('a');
    expect(link?.getAttribute('href')).toBe('/planos');
  });
});
