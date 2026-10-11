import React, { useEffect, useRef, useState } from 'react';
import { Compass, Map as MapIcon, Plus, Heart, MessageCircle, Bookmark, Star } from 'lucide-react';
import { Mascote, MascoteHero } from './Mascote';
import { Logo, btn } from './ui';

export const TUTORIAL_CHAVE = 'vimo_tutorial_v1';

export function tutorialJaVisto(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_CHAVE) === '1';
  } catch {
    return true;
  }
}

export function marcarTutorialVisto() {
  try {
    localStorage.setItem(TUTORIAL_CHAVE, '1');
  } catch {}
}

type Destino = 'explorar' | 'avaliar';

function PistaExplorar() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      {[
        { Icon: Compass, t: 'Explorar' },
        { Icon: MapIcon, t: 'Mapa' },
      ].map(({ Icon, t }) => (
        <span key={t} className="flex items-center gap-2 rounded-full bg-s1 px-4 py-2.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
          <Icon size={17} strokeWidth={2} className="text-primary" />
          {t}
        </span>
      ))}
    </div>
  );
}

function PistaAvaliar() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_8px_24px_rgb(18_75_255_/_0.40)]">
        <Plus size={24} strokeWidth={2.4} />
      </span>
      <span className="flex items-center gap-1 rounded-full bg-s1 px-4 py-2.5 shadow-sm ring-1 ring-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={18} className={i < 4 ? 'fill-primary text-primary' : 'text-s3'} />
        ))}
      </span>
    </div>
  );
}

function PistaAmigos() {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {[
        { Icon: Heart, t: 'Curtir', c: 'text-like' },
        { Icon: MessageCircle, t: 'Comentar', c: 'text-ink' },
        { Icon: Bookmark, t: 'Quero ir', c: 'text-primary' },
      ].map(({ Icon, t, c }) => (
        <span key={t} className="flex items-center gap-1.5 rounded-full bg-s1 px-3.5 py-2.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
          <Icon size={16} strokeWidth={2} className={c} />
          {t}
        </span>
      ))}
    </div>
  );
}

const PASSOS = [
  {
    mascote: <MascoteHero tamanho={220} />,
    cor: 'bg-primary/5',
    titulo: 'Boas comidas aproximam boas pessoas.',
    texto: 'O VIMO é o seu diário gastronômico com amigos: descubra lugares, registre suas idas e veja onde a sua turma come.',
    pista: null,
  },
  {
    mascote: <Mascote reacao="explorando" tamanho={200} animacao="flutuar" />,
    cor: 'bg-[#EEF3FF]',
    titulo: 'Descubra lugares',
    texto: 'No Explorar e no Mapa você encontra restaurantes, cafés e bares da sua cidade, com fotos e notas reais.',
    pista: <PistaExplorar />,
  },
  {
    mascote: <Mascote reacao="avaliando" tamanho={200} animacao="pular" />,
    cor: 'bg-[#FFF7EE]',
    titulo: 'Registre suas idas',
    texto: 'Toque no + azul para dar nota à comida, ao ambiente e ao atendimento. A nota geral é calculada na hora.',
    pista: <PistaAvaliar />,
  },
  {
    mascote: <Mascote reacao="feliz" tamanho={200} animacao="flutuar" />,
    cor: 'bg-[#EEFBF4]',
    titulo: 'Coma bem com quem você segue',
    texto: 'Em Amigos você vê as idas de quem segue, curte, comenta e salva lugares em Quero ir para depois.',
    pista: <PistaAmigos />,
  },
];

export default function TutorialModal({
  onConcluir,
  onPular,
}: {
  onConcluir: (destino: Destino) => void;
  onPular: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const toqueX = useRef<number | null>(null);
  const ultimo = idx === PASSOS.length - 1;
  const passo = PASSOS[idx];

  const ir = (novo: number) => {
    if (novo < 0 || novo >= PASSOS.length) return;
    setDir(novo > idx ? 1 : -1);
    setIdx(novo);
  };

  const pular = () => {
    marcarTutorialVisto();
    onPular();
  };
  const concluir = (d: Destino) => {
    marcarTutorialVisto();
    onConcluir(d);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') ir(idx + 1);
      if (e.key === 'ArrowLeft') ir(idx - 1);
      if (e.key === 'Escape') pular();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Como funciona o VIMO"
      className="fixed inset-0 z-[60] flex justify-center bg-bg"
      onTouchStart={(e) => (toqueX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        if (Math.abs(dx) > 50) ir(idx + (dx < 0 ? 1 : -1));
        toqueX.current = null;
      }}
    >
      <div className="flex h-full w-full max-w-[440px] flex-col pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]">

        {/* Topo: marca e pular */}
        <div className="flex items-center justify-between px-6">
          <Logo altura={22} />
          {!ultimo ? (
            <button type="button" onClick={pular} className="h-9 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink cursor-pointer transition">
              Pular
            </button>
          ) : (
            <span className="h-9" />
          )}
        </div>

        {/* Área do mascote com fundo colorido */}
        <div
          key={`bg-${idx}`}
          className={`relative mx-6 mt-5 rounded-3xl ${passo.cor} flex items-end justify-center overflow-hidden transition-colors duration-500`}
          style={{ height: '52vw', maxHeight: 260 }}
        >
          <div
            key={idx}
            className={`flex items-end justify-center pb-0 animate-in ${dir > 0 ? 'slide-in-from-right' : 'slide-in-from-left'} duration-300`}
          >
            {passo.mascote}
          </div>
        </div>

        {/* Texto do passo */}
        <div
          key={`txt-${idx}`}
          className={`flex-1 flex flex-col justify-start px-6 pt-6 animate-in ${dir > 0 ? 'slide-in-from-right' : 'slide-in-from-left'} duration-300`}
        >
          <h2 className="font-display text-[24px] font-bold leading-snug tracking-[-0.025em] text-ink">
            {passo.titulo}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted max-w-[340px]">
            {passo.texto}
          </p>
          {passo.pista && <div className="mt-5">{passo.pista}</div>}
        </div>

        {/* Progresso */}
        <div className="mb-5 flex justify-center gap-2 px-6" aria-label={`Passo ${idx + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir para o passo ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === idx ? 'w-8 bg-primary' : 'w-2 bg-s3'}`}
            />
          ))}
        </div>

        {/* Ações */}
        <div className="px-6">
          {ultimo ? (
            <div className="space-y-2.5">
              <button type="button" onClick={() => concluir('explorar')} className={`${btn.primary} w-full`}>
                Começar a explorar
              </button>
              <button type="button" onClick={() => concluir('avaliar')} className={`${btn.outline} h-12 w-full`}>
                Registrar minha primeira ida
              </button>
              <button type="button" onClick={() => ir(idx - 1)} className={`${btn.ghost} w-full`}>
                Voltar
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              {idx > 0 && (
                <button type="button" onClick={() => ir(idx - 1)} className={`${btn.outline} h-12 flex-1`}>
                  Voltar
                </button>
              )}
              <button type="button" onClick={() => ir(idx + 1)} className={`${btn.primary} flex-[2]`}>
                {idx === 0 ? 'Começar' : 'Próximo'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
