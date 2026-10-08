import React from 'react';
import { Compass, Map, Plus, Users, User } from 'lucide-react';

export type TabKey = 'explorar' | 'mapa' | 'amigos' | 'perfil';

export default function Navigation({
  tabAtiva,
  onMudarTab,
  onAbrirAvaliar,
}: {
  tabAtiva: TabKey;
  onMudarTab: (tab: TabKey) => void;
  onAbrirAvaliar: () => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[var(--bg)] border-t border-[var(--line)] h-16 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-between">
      <div className="w-full max-w-lg mx-auto flex items-center h-full px-2">
        {/* 1. Explorar */}
        <button
          type="button"
          onClick={() => onMudarTab('explorar')}
          aria-label="Aba Explorar"
          className={`flex-1 h-full min-h-11 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
            tabAtiva === 'explorar'
              ? 'text-[var(--primary)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          <Compass size={22} className="stroke-[1.8]" />
          <span className="text-[11px] tracking-tight leading-none">Explorar</span>
        </button>

        {/* 2. Mapa */}
        <button
          type="button"
          onClick={() => onMudarTab('mapa')}
          aria-label="Aba Mapa"
          className={`flex-1 h-full min-h-11 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
            tabAtiva === 'mapa'
              ? 'text-[var(--primary)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          <Map size={22} className="stroke-[1.8]" />
          <span className="text-[11px] tracking-tight leading-none">Mapa</span>
        </button>

        {/* 3. Botão Central de Adicionar (+) */}
        <div className="flex-1 h-full flex items-center justify-center">
          <button
            type="button"
            onClick={onAbrirAvaliar}
            aria-label="Nova avaliação gastronômica"
            className="w-11 h-11 rounded-[14px] bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer min-h-11 min-w-11"
          >
            <Plus size={22} className="stroke-[2.2]" />
          </button>
        </div>

        {/* 4. Amigos */}
        <button
          type="button"
          onClick={() => onMudarTab('amigos')}
          aria-label="Aba Amigos"
          className={`flex-1 h-full min-h-11 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
            tabAtiva === 'amigos'
              ? 'text-[var(--primary)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          <Users size={22} className="stroke-[1.8]" />
          <span className="text-[11px] tracking-tight leading-none">Amigos</span>
        </button>

        {/* 5. Perfil */}
        <button
          type="button"
          onClick={() => onMudarTab('perfil')}
          aria-label="Aba Perfil"
          className={`flex-1 h-full min-h-11 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
            tabAtiva === 'perfil'
              ? 'text-[var(--primary)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          <User size={22} className="stroke-[1.8]" />
          <span className="text-[11px] tracking-tight leading-none">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
