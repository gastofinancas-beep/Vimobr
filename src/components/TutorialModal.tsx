import React, { useEffect, useRef, useState } from 'react';
import { Compass, Map as MapIcon, Plus, Heart, MessageCircle, Bookmark, Star } from 'lucide-react';
import { Mascote, MascoteHero } from './Mascote';
import { Logo, btn } from './ui';

export const TUTORIAL_CHAVE = 'vimo_tutorial_v1';

export function tutorialJaVisto(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_CHAVE) === '1';
  } catch {
    return true; // sem armazenamento: não insiste em mostrar
  }
}

export function marcarTutorialVisto() {
  try {
    localStorage.setItem(TUTORIAL_CHAVE, '1');
  } catch {}
}

type Destino = 'explorar' | 'avaliar';

/** Pequenas pistas visuais da interface real, para a pessoa reconhecer depois. */
function PistaExplorar() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      {[
        { Icon: Compass, t: 'Explorar' },
        { Icon: MapIcon, t: 'Mapa' },
      ].map(({ Icon, t }) => (
        <span key={t} className="flex items-center gap-2 rounded-full bg-s1 px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
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
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_6px_18px_rgb(37_99_255_/_0.35)]">
        <Plus size={22} strokeWidth={2.4} />
      </span>
      <span className="flex items-center gap-1 rounded-full bg-s1 px-3.5 py-2 shadow-sm ring-1 ring-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={16} className={i < 4 ? 'fill-primary text-primary' : 'text-s3'} />
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
        <span key={t} className="flex items-center gap-1.5 rounded-full bg-s1 px-3 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
          <Icon size={16} strokeWidth={2} className={c} />
          {t}
        </span>
      ))}
    </div>
  );
}

const PASSOS = [
  {
    arte: <MascoteHero tamanho={190} />,
    titulo: 'Boas comidas aproximam boas pessoas.',
    texto: 'O VIMO é o seu diário gastronômico com amigos: descubra lugares, registre suas idas e veja onde a sua turma come.',
    pista: null,
  },
  {
    arte: <Mascote reacao="explorando" tamanho={150} />,
    titulo: 'Descubra lugares',
    texto: 'No Explorar e no Mapa você encontra restaurantes, cafés e bares da sua cidade, com fotos e notas reais.',
    pista: <PistaExplorar />,
  },
  {
    arte: <Mascote reacao="avaliando" tamanho={150} />,
    titulo: 'Registre suas idas',
    texto: 'Toque no + azul para dar nota à comida, ao ambiente e ao atendimento. A nota geral é a média de tudo.',
    pista: <PistaAvaliar />,
  },
  {
    arte: <Mascote reacao="socializando" tamanho={150} />,
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
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Como funciona o VIMO"
      className="fixed inset-0 z-[60] flex justify-center bg-bg animate-in"
      onTouchStart={(e) => (toqueX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        if (Math.abs(dx) > 50) ir(idx + (dx < 0 ? 1 : -1));
        toqueX.current = null;
      }}
    >
      <div className="flex h-full w-full max-w-[440px] flex-col px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        {/* Topo: marca, progresso e pular */}
        <div className="flex items-center justify-between">
          <Logo altura={22} />
          {!ultimo ? (
            <button type="button" onClick={pular} className="h-9 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink cursor-pointer">
              Pular
            </button>
          ) : (
            <span className="h-9" />
          )}
        </div>

        {/* Conteúdo do passo */}
        <div
          key={idx}
          className={`flex flex-1 flex-col items-center justify-center text-center animate-in ${dir > 0 ? 'slide-in-from-right' : 'slide-in-from-left'}`}
        >
          <div className="flex h-[210px] items-end justify-center">{passo.arte}</div>
          <h2 className="mt-6 text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink">{passo.titulo}</h2>
          <p className="mt-3 max-w-[330px] text-[15px] leading-relaxed text-muted">{passo.texto}</p>
          {passo.pista && <div className="mt-6">{passo.pista}</div>}
        </div>

        {/* Progresso */}
        <div className="mb-5 flex justify-center gap-1.5" aria-label={`Passo ${idx + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir para o passo ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-s3'}`}
            />
          ))}
        </div>

        {/* Ações */}
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
  );
}
