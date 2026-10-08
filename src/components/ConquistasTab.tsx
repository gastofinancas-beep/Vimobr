import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
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
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { obterResumoConquistas, type Badge, type BadgeTier } from '../lib/badges';
import type { Review } from '../types';

function renderBadgeIcon(icone: string, desbloqueada: boolean) {
  const size = 22;
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
  ouro: { label: 'Ouro Raro' },
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

  return (
    <div className="space-y-4 pt-1">
      {/* Banner de Reconhecimentos */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--s1)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--s2)] text-[var(--star)] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-[15px] text-[var(--ink)] leading-tight">
                  Cofre de Reconhecimentos
                </h3>
                <p className="text-[12px] text-[var(--muted)]">
                  Recompensas secretas conquistadas com dedicação gastronômica.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-medium text-[var(--ink)] shrink-0">
            <Sparkles size={13} className="text-[var(--star)]" />
            <span>{desbloqueadas.length}/{badges.length} reveladas</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--s2)] text-[12px] text-[var(--muted)] flex items-center gap-2.5 leading-relaxed">
          <EyeOff size={16} className="text-[var(--star)] shrink-0" />
          <span>
            Cada conquista é um marco. Viva experiências reais, avalie com sinceridade e descubra cada selo ao atingir os feitos.
          </span>
        </div>
      </div>

      {/* Filtros em chips roláveis com alvo de toque mín 44px */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setFiltro('todas')}
          className={`min-h-11 px-4 rounded-xl text-[13px] font-medium cursor-pointer transition ${
            filtro === 'todas'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Todas ({badges.length})
        </button>
        <button
          type="button"
          onClick={() => setFiltro('conquistadas')}
          className={`min-h-11 px-4 rounded-xl text-[13px] font-medium cursor-pointer transition ${
            filtro === 'conquistadas'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Desbloqueadas ({desbloqueadas.length})
        </button>
        <button
          type="button"
          onClick={() => setFiltro('ocultas')}
          className={`min-h-11 px-4 rounded-xl text-[13px] font-medium cursor-pointer transition ${
            filtro === 'ocultas'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Ocultas ({badges.length - desbloqueadas.length})
        </button>
      </div>

      {/* Grid de Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaExibida.map((b) => {
          const tierInfo = TIER_CONFIG[b.tier] || TIER_CONFIG.bronze;

          return (
            <div
              key={b.id}
              className={`relative overflow-hidden rounded-2xl border p-3.5 flex gap-3 transition ${
                b.desbloqueada
                  ? 'border-[var(--primary)]/40 bg-[var(--s1)]'
                  : 'border-[var(--line)] bg-[var(--s1)] opacity-75'
              }`}
            >
              {/* Ícone da Badge */}
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  b.desbloqueada
                    ? 'bg-[var(--s2)] text-[var(--star)] border border-[var(--primary)]/30'
                    : 'bg-[var(--s2)] text-[var(--muted)] border border-[var(--line)]'
                }`}
              >
                {renderBadgeIcon(b.icone, b.desbloqueada)}
              </div>

              {/* Informações da Badge */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-medium text-[14px] text-[var(--ink)] truncate">
                      {b.desbloqueada ? b.titulo : 'Conquista Oculta'}
                    </h4>
                    {b.desbloqueada ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--star)] px-2 py-0.5 rounded-full bg-[var(--s2)] shrink-0">
                        <CheckCircle2 size={12} />
                        <span>+{b.pontos} pts</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[var(--muted)] px-2 py-0.5 rounded-full bg-[var(--s2)] shrink-0">
                        <Lock size={11} />
                        <span>Secreta</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed mt-1">
                    {b.desbloqueada ? b.descricao : b.pistaSecreta}
                  </p>
                </div>

                {b.desbloqueada ? (
                  <div className="pt-2 flex items-center justify-between text-[12px] text-[var(--star)] font-medium border-t border-[var(--line)] mt-2">
                    <span className="uppercase tracking-wider">{tierInfo.label}</span>
                    <span>Desbloqueada 🎉</span>
                  </div>
                ) : (
                  <div className="pt-2 flex items-center justify-between text-[12px] text-[var(--muted)] border-t border-[var(--line)] mt-2">
                    <span>Recompensa Oculta</span>
                    <span>??? pts</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
