import { Component, type ReactNode } from 'react';

/**
 * Sem isto, qualquer erro numa tela deixava o app inteiro em branco.
 * Mostra uma saída simples: recarregar.
 */
export default class ErroGlobal extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro: unknown) {
    console.error('Erro não tratado na tela:', erro);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center gap-4 px-8 text-center">
        <img src="/mascote/erro.png" alt="" className="w-28 h-28 object-contain" />
        <h1 className="t-title">Algo deu errado</h1>
        <p className="text-sm text-[var(--muted)] max-w-xs">
          O que você já salvou continua no aparelho. Recarregue para continuar.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 px-6 rounded-full bg-[var(--ink)] text-[var(--bg)] text-sm font-semibold cursor-pointer"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
