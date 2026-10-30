import React from 'react';

const RELOAD_FLAG_KEY = 'liggasst:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

// Erros típicos de chunk dinâmico perdido após um novo deploy
const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
};

interface State {
  hasError: boolean;
}

/**
 * Captura erros de renderização. Quando o erro é de chunk dinâmico
 * (típico quando um deploy novo invalida os assets que a aba aberta
 * ainda referencia), recarrega a página UMA vez por minuto no máximo,
 * para buscar o index.html novo sem risco de loop de recarga.
 * Outros erros mostram uma tela de fallback com recarga manual.
 */
class ChunkErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (!isChunkLoadError(error)) return;

    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? 0);
    const canReload = Date.now() - lastReload > RELOAD_COOLDOWN_MS;
    if (canReload) {
      sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
      window.location.reload();
    }
  }

  handleManualReload = () => {
    sessionStorage.removeItem(RELOAD_FLAG_KEY);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-gray">
          <div className="text-center max-w-md px-4">
            <h1 className="font-poppins font-bold text-2xl text-soft-black mb-4">
              Algo não carregou como deveria
            </h1>
            <p className="font-roboto text-gray-600 mb-6">
              Isso pode acontecer logo após uma atualização do site.
              Recarregue a página para tentar novamente.
            </p>
            <button
              onClick={this.handleManualReload}
              className="bg-green-deep text-white font-roboto font-medium px-6 py-3 rounded-lg hover:bg-green-medium transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
