import { useEffect } from 'react';

/** Fecha folhas e modais com a tecla Esc (teclado físico e leitores de tela). */
export function useEscape(onEscape: () => void, ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, ativo]);
}
