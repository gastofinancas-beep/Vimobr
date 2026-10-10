import React, { useState } from 'react';
import { Star } from 'lucide-react';

/* ==========================================================================
   Componentes base do VIMO (identidade: preto, azul elétrico, off-white)
   Pequenos e sem dependências; as telas usam estes para manter um só padrão.
   ========================================================================== */

/** Tons da marca para lugares sem foto. */
const CORES_POSTER = ['#101116', '#124BFF', '#2A2B33', '#0D37BF', '#1D1E26', '#3B3C44'];

export function corDoLugar(nome = ''): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return CORES_POSTER[h % CORES_POSTER.length];
}

/**
 * Imagem de lugar com fallback: se a foto não existir ou falhar,
 * mostra um bloco na cor da marca (com o nome, quando pedido).
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
        <span className="w-full p-2.5 text-xs font-semibold leading-snug text-white line-clamp-3">{name}</span>
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
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-s3 font-semibold text-ink-2 ${className}`}
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

/** Carregamento no estilo da prancha: anel de 8 pontos azuis. */
export function Spinner({ label = 'Carregando', className = '', size = 28 }: { label?: string; className?: string; size?: number }) {
  return (
    <div role="status" className={`flex items-center justify-center py-12 ${className}`}>
      <span className="vimo-pontos relative block" style={{ width: size, height: size }} aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 rounded-full bg-primary"
            style={{
              width: size * 0.2,
              height: size * 0.2,
              marginLeft: -(size * 0.1),
              transformOrigin: `50% ${size / 2}px`,
              transform: `rotate(${i * 45}deg)`,
              opacity: 0.25 + (i / 7) * 0.75,
            }}
          />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Logo "vimo" (arte oficial): versão escura no tema claro e clara no tema escuro. */
export function Logo({ altura = 26, className = '' }: { altura?: number; className?: string }) {
  const largura = Math.round(altura * (325 / 116));
  return (
    <span className={`inline-block select-none ${className}`} style={{ width: largura, height: altura }}>
      <img src="/brand/vimo-logo-escuro.png" alt="vimo" width={largura} height={altura} className="block dark:hidden" />
      <img src="/brand/vimo-logo-claro.png" alt="vimo" width={largura} height={altura} className="hidden dark:block" />
    </span>
  );
}

/** Selo de nota sobre a foto (branco, como na prancha). */
export function RatingBadge({ nota, className = '' }: { nota: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-[#101116] shadow-sm tabular ${className}`}
    >
      <Star size={11} className="fill-[#124BFF] text-[#124BFF]" />
      {nota.toFixed(1).replace('.', ',')}
    </span>
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
        <button type="button" onClick={onAction} className="text-sm font-semibold text-primary cursor-pointer">
          {action}
        </button>
      )}
    </div>
  );
}

/** Classes reutilizáveis (um só padrão de altura, raio e peso). */
export const btn = {
  // ação principal: pílula preta (no escuro, off-white)
  primary:
    'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-cta text-on-cta text-[15px] font-semibold transition active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  // ação de destaque da marca: pílula azul
  accent:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-primary text-on-primary text-sm font-semibold transition active:scale-[0.98] hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  secondary:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-s2 text-ink text-sm font-semibold transition-colors hover:bg-s3 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  outline:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-s1 text-ink text-sm font-semibold ring-1 ring-inset ring-line transition-colors hover:bg-s2 disabled:opacity-40 cursor-pointer',
  ghost:
    'inline-flex items-center justify-center gap-2 h-11 px-3 rounded-full text-ink-2 text-sm font-medium transition-colors hover:bg-s2 hover:text-ink disabled:opacity-40 cursor-pointer',
  icon:
    'inline-flex items-center justify-center w-10 h-10 rounded-full text-ink-2 transition-colors hover:text-ink hover:bg-s2 cursor-pointer',
} as const;

/** Filtro em pílula: ativo em azul suave, inativo em cinza claro. */
export const chip = (ativo: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm whitespace-nowrap transition-colors cursor-pointer ${
    ativo ? 'bg-primary text-on-primary font-semibold' : 'bg-s2 text-ink-2 hover:text-ink'
  }`;

/** Cartão padrão: branco, cantos arredondados, sombra discreta. */
export const card = 'rounded-2xl bg-s1 shadow-sm dark:shadow-none dark:ring-1 dark:ring-line';

/** Campo de texto padrão. */
export const inputClass =
  'w-full h-12 px-4 rounded-xl bg-s2 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary focus:bg-s1 transition';

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-line ${className}`} />;
}

export default {};
