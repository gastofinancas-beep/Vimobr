import React from 'react';
import {
  Award,
  Camera,
  Coffee,
  Croissant,
  Crown,
  Flag,
  Flame,
  Heart,
  Lock,
  Pizza,
  PenLine,
  Trophy,
  Users,
  Wine,
} from 'lucide-react';
import type { Badge, BadgeTier } from '../lib/badges';

const ICONES: Record<string, typeof Award> = {
  flag: Flag,
  coffee: Coffee,
  pizza: Pizza,
  drink: Wine,
  bakery: Croissant,
  crown: Crown,
  trophy: Trophy,
  users: Users,
  flame: Flame,
  camera: Camera,
  heart: Heart,
  pen: PenLine,
};

/**
 * Níveis com as cores da marca (sem dourado e prata genéricos):
 * bronze = off-white com contorno, prata = preto, ouro = azul, diamante = azul com anel preto.
 */
const NIVEL: Record<BadgeTier, { disco: string; icone: string; rotulo: string }> = {
  bronze: { disco: 'bg-s1 ring-2 ring-inset ring-line', icone: 'text-ink', rotulo: 'Bronze' },
  prata: { disco: 'bg-ink', icone: 'text-bg', rotulo: 'Prata' },
  ouro: { disco: 'bg-primary', icone: 'text-white', rotulo: 'Ouro' },
  diamante: { disco: 'bg-primary ring-[3px] ring-ink ring-offset-2 ring-offset-bg', icone: 'text-white', rotulo: 'Diamante' },
};

export const rotuloNivel = (t: BadgeTier) => NIVEL[t].rotulo;

export function IconeMedalha({ icone, size = 20 }: { icone: string; size?: number }) {
  const Icon = ICONES[icone] || Award;
  return <Icon size={size} strokeWidth={2} />;
}

/** Medalha redonda. Bloqueada: cinza com cadeado. */
export function Medalha({
  badge,
  tamanho = 56,
  className = '',
}: {
  badge: Pick<Badge, 'icone' | 'tier' | 'desbloqueada' | 'titulo'>;
  tamanho?: number;
  className?: string;
}) {
  const n = NIVEL[badge.tier] || NIVEL.bronze;
  const icon = Math.round(tamanho * 0.42);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${
        badge.desbloqueada ? `${n.disco} ${n.icone}` : 'bg-s2 text-muted'
      } ${className}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {badge.desbloqueada ? <IconeMedalha icone={badge.icone} size={icon} /> : <Lock size={Math.round(icon * 0.8)} strokeWidth={2} />}
    </span>
  );
}

/** Selo PRO ao lado do nome. */
export function SeloPro({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full bg-primary px-2 text-[11px] font-bold tracking-wide text-white ${className}`}
      aria-label="Assinante VIMO PRO"
    >
      PRO
    </span>
  );
}
