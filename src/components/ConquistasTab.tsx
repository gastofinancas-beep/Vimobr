import React, { useState } from 'react';
import {
  Trophy,
  Lock,
  Sparkles,
  Award,
  Coffee,
  Pizza,
  Wine,
  Croissant,
  Crown,
  Users,
  Flame,
  Camera,
  Heart,
  HelpCircle,
} from 'lucide-react';
import { obterResumoConquistas, type Badge, type BadgeTier } from '../lib/badges';
import type { Review } from '../types';

function renderBadgeIcon(icone: string, desbloqueada: boolean) {
  const size = 20;
  const className = desbloqueada ? 'text-[var(--star)]' : 'text-[var(--muted)]';

  if (!desbloqueada) {
    return <HelpCircle size={size} className={className} />;
  }

  switch (icone) {
    case 'coffee':
      return <Coffee size={size} className={className} />;
    case 'pizza':
      return <Pizza size={size} className={className} />;
    case 'drink':
      return <Wine size={size} className={className} />;
    case 'bakery':
      return <Croissant size={size} className={className} />;
    case 'crown':
      return <Crown size={size} className={className} />;
    case 'trophy':
      return <Trophy size={size} className={className} />;
    case 'users':
      return <Users size={size} className={className} />;
    case 'flame':
      return <Flame size={size} className={className} />;
    case 'camera':
      return <Camera size={size} className={className} />;
    case 'heart':
      return <Heart size={size} className={className} />;
    case 'sparkles':
      return <Sparkles size={size} className={className} />;
    default:
      return <Award size={size} className={className} />;
  }
}

const TIER_CONFIG: Record<BadgeTier, { label: string }> = {
  bronze: { label: 'Bronze' },
  prata: { label: 'Prata' },
  ouro: { label: 'Ouro' },
  diamante: { label: 'Lendário' },
};

type Filtro = 'todas' | 'conquistadas' | 'ocultas';

export default function ConquistasTab({ reviews }: { reviews: Review[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const resumo = obterResumoConquistas(reviews);
  const { badges, desbloqueadas } = resumo;

  const listaExibida = badges.filter((b) => {
    if (filtro === 'conquistadas') return b.desbloqueada;
    if (filtro === 'ocultas') return !b.desbloqueada;
    return true;
  });

  const pct = badges.length ? Math.round((desbloqueadas.length / badges.length) * 100) : 0;
  const filtros: { key: Filtro; label: string; n: number }[] = [
    { key: 'todas', label: 'Todas', n: badges.length },
    { key: 'conquistadas', label: 'Desbloqueadas', n: desbloqueadas.length },
    { key: 'ocultas', label: 'Ocultas', n: badges.length - desbloqueadas.length },
  ];

  return (
    <div className="space-y-5">
      {/* Resumo com o mascote: conquistas são um momento de celebração */}
      <div className="flex items-center gap-4">
        <img
          src={`/mascot/vimo_${desbloqueadas.length > 0 ? 'orgulhoso' : 'incentivando'}.png`}
          alt=""
          aria-hidden="true"
          width={56}
          height={58}
          className="shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink tabular">
            {desbloqueadas.length} de {badges.length} conquistas
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-s2" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-muted">Algumas só aparecem quando você chega lá.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {filtros.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            aria-pressed={filtro === f.key}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors cursor-pointer ${
              filtro === f.key ? 'bg-ink text-bg font-semibold' : 'text-muted ring-1 ring-inset ring-line hover:text-ink'
            }`}
          >
            {f.label} <span className="tabular opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <ul className="divide-y divide-line">
        {listaExibida.map((b) => {
          const tierInfo = TIER_CONFIG[b.tier] || TIER_CONFIG.bronze;
          return (
            <li key={b.id} className={`flex gap-3.5 py-3.5 ${b.desbloqueada ? '' : 'opacity-60'}`}>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  b.desbloqueada ? 'bg-star/12' : 'bg-s2'
                }`}
              >
                {renderBadgeIcon(b.icone, b.desbloqueada)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="truncate text-[15px] font-semibold text-ink">
                    {b.desbloqueada ? b.titulo : 'Conquista oculta'}
                  </h4>
                  {b.desbloqueada ? (
                    <span className="shrink-0 t-meta tabular">
                      {tierInfo.label} · {b.pontos} pts
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 t-meta">
                      <Lock size={11} /> Oculta
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">{b.desbloqueada ? b.descricao : b.pistaSecreta}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
