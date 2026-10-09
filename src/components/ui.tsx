import React, { useState } from 'react';

/* ==========================================================================
   Componentes base do VIMO
   Pequenos, sem dependências, usados pelas telas para manter um só padrão.
   ========================================================================== */

/** Cores lisas da identidade para lugares sem foto (pôster). */
const CORES_POSTER = ['#1F3163', '#2B2F42', '#243552', '#2E2A3A', '#1C2A3D', '#33303F'];

export function corDoLugar(nome = ''): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return CORES_POSTER[h % CORES_POSTER.length];
}

/**
 * Imagem de lugar com fallback: se a foto não existir ou falhar,
 * mostra um bloco de cor lisa (com o nome, quando pedido).
 */
export function PlaceImage({
  src,
  name,
  className = '',
  showName = false,
  loading = 'lazy',
}: {
  src?: string | null;
  name?: string;
  className?: string;
  showName?: boolean;
  loading?: 'lazy' | 'eager';
}) {
  const [falhou, setFalhou] = useState(false);
  if (src && !falhou) {
    return (
      <img
        src={src}
        alt={name || ''}
        loading={loading}
        onError={() => setFalhou(true)}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={name || 'Lugar sem foto'}
      className={`flex items-end ${className}`}
      style={{ backgroundColor: corDoLugar(name) }}
    >
      {showName && name && (
        <span className="w-full p-2.5 text-xs font-semibold leading-snug text-[#F7F3EE] line-clamp-3">{name}</span>
      )}
    </div>
  );
}

/** Avatar redondo com inicial quando não há foto (ou a foto falha). */
export function Avatar({
  src,
  name,
  size = 32,
  className = '',
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const inicial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-s2 font-semibold text-ink-2 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
    >
      {src && !falhou ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFalhou(true)} />
      ) : (
        <span aria-hidden="true">{inicial}</span>
      )}
    </span>
  );
}

/** Indicador de carregamento discreto (sem mascote: carregar não é um momento). */
export function Spinner({ label = 'Carregando', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center py-12 ${className}`}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-primary" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Cabeçalho de seção: título + ação opcional à direita. */
export function SectionHeader({
  title,
  action,
  onAction,
  className = '',
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="t-section text-ink">{title}</h2>
      {action && onAction && (
        <button type="button" onClick={onAction} className="text-sm font-medium text-primary cursor-pointer">
          {action}
        </button>
      )}
    </div>
  );
}

/** Classes de botão reutilizáveis (um só padrão de altura, raio e peso). */
export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary text-on-primary text-sm font-semibold transition-colors hover:bg-primary-hover active:opacity-90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  secondary:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-s2 text-ink text-sm font-semibold transition-colors hover:bg-s3 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  ghost:
    'inline-flex items-center justify-center gap-2 h-11 px-3 rounded-lg text-ink-2 text-sm font-medium transition-colors hover:bg-s2 hover:text-ink disabled:opacity-40 cursor-pointer',
  icon:
    'inline-flex items-center justify-center w-10 h-10 rounded-full text-muted transition-colors hover:text-ink hover:bg-s2 cursor-pointer',
} as const;

/** Campo de texto padrão. */
export const inputClass =
  'w-full h-11 px-3.5 rounded-lg bg-s2 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition';

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-line ${className}`} />;
}

export default {};
