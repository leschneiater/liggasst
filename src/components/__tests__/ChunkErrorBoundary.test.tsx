import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChunkErrorBoundary from '../ChunkErrorBoundary';

const reloadMock = vi.fn();
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const Thrower = ({ message }: { message: string }): React.ReactNode => {
  throw new Error(message);
};

describe('ChunkErrorBoundary', () => {
  beforeEach(() => {
    reloadMock.mockReset();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
    // React registra erros de boundary no console; silenciado para manter a saída limpa
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renderiza os filhos quando não há erro', () => {
    render(
      <ChunkErrorBoundary>
        <div>conteúdo normal</div>
      </ChunkErrorBoundary>
    );
    expect(screen.getByText('conteúdo normal')).toBeInTheDocument();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('mostra a tela de erro sem recarregar quando o erro não é de chunk', () => {
    render(
      <ChunkErrorBoundary>
        <Thrower message="falha genérica de renderização" />
      </ChunkErrorBoundary>
    );
    expect(screen.getByText('Algo não carregou como deveria')).toBeInTheDocument();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('recarrega uma vez quando o erro é de chunk dinâmico perdido', () => {
    render(
      <ChunkErrorBoundary>
        <Thrower message="Loading chunk 482 failed." />
      </ChunkErrorBoundary>
    );
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('não recarrega de novo dentro do cooldown de 60 segundos', () => {
    sessionStorage.setItem('liggasst:chunk-reload-at', String(Date.now()));
    render(
      <ChunkErrorBoundary>
        <Thrower message="Failed to fetch dynamically imported module" />
      </ChunkErrorBoundary>
    );
    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText('Algo não carregou como deveria')).toBeInTheDocument();
  });

  it('o botão de recarga manual limpa a trava e recarrega a página', () => {
    sessionStorage.setItem('liggasst:chunk-reload-at', String(Date.now()));
    render(
      <ChunkErrorBoundary>
        <Thrower message="falha genérica de renderização" />
      </ChunkErrorBoundary>
    );
    fireEvent.click(screen.getByText('Recarregar página'));
    expect(sessionStorage.getItem('liggasst:chunk-reload-at')).toBeNull();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
