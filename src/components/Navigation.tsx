import React from 'react';
import { Compass, Map, Plus, Users, User } from 'lucide-react';

export type TabKey = 'explorar' | 'mapa' | 'amigos' | 'perfil';

const tabClass = (ativa: boolean) =>
  `flex-1 h-full flex flex-col items-center justify-center gap-1 pt-2 transition-colors cursor-pointer min-h-11 ${
    ativa ? 'text-ink [&_span]:font-bold' : 'text-muted hover:text-ink'
  }`;

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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-s1/95 backdrop-blur-md border-t border-line h-[76px] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-lg mx-auto flex items-start h-full px-1.5">
        {/* 1. Explorar */}
        <button
          type="button"
          onClick={() => onMudarTab('explorar')}
          aria-label="Aba Explorar"
          aria-current={tabAtiva === 'explorar' ? 'page' : undefined}
          className={tabClass(tabAtiva === 'explorar')}
        >
          <Compass size={24} strokeWidth={1.8} />
          <span className="text-2xs font-semibold leading-none">Explorar</span>
        </button>

        {/* 2. Mapa */}
        <button
          type="button"
          onClick={() => onMudarTab('mapa')}
          aria-label="Aba Mapa"
          aria-current={tabAtiva === 'mapa' ? 'page' : undefined}
          className={tabClass(tabAtiva === 'mapa')}
        >
          <Map size={24} strokeWidth={1.8} />
          <span className="text-2xs font-semibold leading-none">Mapa</span>
        </button>

        {/* 3. Botão central de avaliar, elevado sobre a barra */}
        <div className="flex-1 h-full flex items-start justify-center">
          <button
            type="button"
            onClick={onAbrirAvaliar}
            aria-label="Nova avaliação gastronômica"
            className="-mt-4 w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-bg shadow-[0_6px_18px_rgb(37_99_255_/_0.35)] transition-transform active:scale-90 hover:bg-primary-hover cursor-pointer"
          >
            <Plus size={24} strokeWidth={2.4} />
          </button>
        </div>

        {/* 4. Amigos */}
        <button
          type="button"
          onClick={() => onMudarTab('amigos')}
          aria-label="Aba Amigos"
          aria-current={tabAtiva === 'amigos' ? 'page' : undefined}
          className={tabClass(tabAtiva === 'amigos')}
        >
          <Users size={24} strokeWidth={1.8} />
          <span className="text-2xs font-semibold leading-none">Amigos</span>
        </button>

        {/* 5. Perfil */}
        <button
          type="button"
          onClick={() => onMudarTab('perfil')}
          aria-label="Aba Perfil"
          aria-current={tabAtiva === 'perfil' ? 'page' : undefined}
          className={tabClass(tabAtiva === 'perfil')}
        >
          <User size={24} strokeWidth={1.8} />
          <span className="text-2xs font-semibold leading-none">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
