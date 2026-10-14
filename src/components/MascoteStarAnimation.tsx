import React, { useEffect, useState } from 'react';

/**
 * Sprite sheet em /public/mascote/sticker-estrelas.png
 * 5 colunas × 2 linhas = 10 frames, dimensão original 1536×1024 px.
 * Cada frame: 307,2 × 512 px (relação 0,6).
 *
 * O componente loopa continuamente para ter vida própria enquanto estiver visível.
 */
export function MascoteStarAnimation({ tamanho = 160 }: { tamanho?: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setFrame((f) => (f + 1) % 10), 100);
    return () => clearTimeout(t);
  }, [frame]);

  const scale = tamanho / 512;
  const frameW = Math.round(307.2 * scale);
  const bgW = Math.round(1536 * scale);
  const bgH = Math.round(1024 * scale);
  const col = frame % 5;
  const row = Math.floor(frame / 5);

  return (
    <div
      className="mx-auto"
      style={{
        width: frameW,
        height: tamanho,
        backgroundImage: 'url(/mascote/sticker-estrelas.png)',
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${-col * frameW}px ${-row * tamanho}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'auto',
      }}
      aria-hidden="true"
    />
  );
}

export default MascoteStarAnimation;
