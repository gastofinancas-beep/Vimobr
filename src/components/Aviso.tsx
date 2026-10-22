import { useSyncExternalStore } from 'react';

// Aviso curto no rodapé que sobrevive à troca de tela (ex.: o post some da lista ao ser apagado)
let atual: { id: number; texto: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((f) => f());

export function mostrarAviso(texto: string, ms = 2600) {
  atual = { id: Date.now(), texto };
  notificar();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    atual = null;
    notificar();
  }, ms);
}

export function AvisoHost() {
  const aviso = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual
  );
  if (!aviso) return null;
  return (
    <div
      key={aviso.id}
      role="status"
      className="fixed bottom-28 left-1/2 z-[80] max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-center text-[13px] font-medium text-bg shadow-lg"
    >
      {aviso.texto}
    </div>
  );
}
