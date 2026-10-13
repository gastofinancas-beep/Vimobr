import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Mascote } from './Mascote';
import type { Reacao, MascoteAnimacao } from './Mascote';

interface Slide {
  reacao: Reacao;
  animacao: MascoteAnimacao;
  titulo: string;
  descricao: string;
  bgTop: string;
  bgBottom: string;
  textTop: string;
}

const SLIDES: Slide[] = [
  {
    reacao: 'boas-vindas',
    animacao: 'flutuar',
    titulo: 'Seu diário\ngastronômico',
    descricao: 'Registre cada restaurante, café e bar. Simples, rápido — sem nada sobrando.',
    bgTop: '#124BFF',
    bgBottom: '#0D3BCC',
    textTop: '#FFFFFF',
  },
  {
    reacao: 'explorando',
    animacao: 'flutuar',
    titulo: 'Descubra o que\nestá perto',
    descricao: 'Mapa em tempo real com os lugares favoritos da sua cidade e do seu bairro.',
    bgTop: '#101116',
    bgBottom: '#0A0B0E',
    textTop: '#FFFFFF',
  },
  {
    reacao: 'socializando',
    animacao: 'orgulho',
    titulo: 'Siga quem\nvocê confia',
    descricao: 'Veja onde seus amigos foram e o que acharam — antes de escolher onde ir.',
    bgTop: '#124BFF',
    bgBottom: '#0D3BCC',
    textTop: '#FFFFFF',
  },
  {
    reacao: 'comemorando',
    animacao: 'pular',
    titulo: 'Construa sua\nhistória',
    descricao: 'A cada visita registrada, sua jornada cresce. Conquiste medalhas e deixe sua marca.',
    bgTop: '#F8F7F4',
    bgBottom: '#EDECEA',
    textTop: '#101116',
  },
];

const STORAGE_KEY = 'vimo_onboarding_slides_visto';

export function slidesJaVistos(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

interface OnboardingSlidesProps {
  onConcluir: () => void;
}

export default function OnboardingSlides({ onConcluir }: OnboardingSlidesProps) {
  const [atual, setAtual] = useState(0);
  const [saindo, setSaindo] = useState(false);

  const slide = SLIDES[atual];
  const isUltimo = atual === SLIDES.length - 1;

  const avancar = useCallback(() => {
    if (isUltimo) {
      setSaindo(true);
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setTimeout(onConcluir, 400);
      return;
    }
    setAtual((p) => p + 1);
  }, [isUltimo, onConcluir]);

  const pular = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    onConcluir();
  };

  // Swipe para avançar
  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 60) avancar();
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [avancar]);

  const isDark = slide.textTop === '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#101116';
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(16,17,22,0.55)';
  const dotActive = isDark ? '#FFFFFF' : '#124BFF';
  const dotInactive = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(16,17,22,0.18)';

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col transition-opacity duration-400 ${saindo ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: `linear-gradient(180deg, ${slide.bgTop} 0%, ${slide.bgBottom} 100%)` }}
    >
      {/* Botão pular */}
      <div className="flex justify-end px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        {!isUltimo && (
          <button
            type="button"
            onClick={pular}
            style={{ color: textMuted }}
            className="text-sm font-semibold px-3 py-2 rounded-full cursor-pointer transition hover:opacity-80"
          >
            Pular
          </button>
        )}
      </div>

      {/* Mascote — área superior */}
      <div className="flex flex-1 items-center justify-center px-8 pb-4">
        <div
          key={atual}
          style={{ animation: 'vimo-slide-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <Mascote
            reacao={slide.reacao}
            animacao={slide.animacao}
            tamanho={200}
          />
        </div>
      </div>

      {/* Card de texto inferior */}
      <div
        className="px-6 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-6 space-y-5"
        key={`text-${atual}`}
        style={{ animation: 'vimo-fade-up 0.4s ease both 0.15s' }}
      >
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAtual(i)}
              className="cursor-pointer rounded-full transition-all duration-300"
              style={{
                width: i === atual ? 24 : 8,
                height: 8,
                background: i === atual ? dotActive : dotInactive,
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Texto */}
        <div className="space-y-2.5">
          <h1
            className="font-display leading-tight"
            style={{
              fontSize: 'clamp(28px, 7vw, 36px)',
              fontWeight: 800,
              color: textPrimary,
              whiteSpace: 'pre-line',
            }}
          >
            {slide.titulo}
          </h1>
          <p style={{ color: textMuted, fontSize: 16, lineHeight: 1.55 }}>
            {slide.descricao}
          </p>
        </div>

        {/* Botão avançar */}
        <button
          type="button"
          onClick={avancar}
          className="w-full h-14 rounded-2xl font-bold text-base cursor-pointer transition active:scale-[0.97] flex items-center justify-center gap-2"
          style={{
            background: isDark ? '#FFFFFF' : '#124BFF',
            color: isDark ? '#124BFF' : '#FFFFFF',
            fontSize: 16,
          }}
        >
          {isUltimo ? 'Entrar no VIMO' : 'Continuar'}
          {isUltimo ? <ArrowRight size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />}
        </button>
      </div>

      <style>{`
        @keyframes vimo-slide-in {
          from { opacity: 0; transform: translateY(28px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vimo-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
