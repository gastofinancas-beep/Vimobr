import React, { useEffect, useRef, useState } from 'react';
import { Mascote, type MascoteAnimacao, type Reacao } from './Mascote';
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

interface Passo {
  reacao: Reacao;
  animacao: MascoteAnimacao;
  cor: string;
  fala: string;
  titulo: string;
  texto: string;
}

const PASSOS: Passo[] = [
  {
    reacao: 'boas-vindas',
    animacao: 'flutuar',
    cor: '#EEF2FF',
    fala: 'Oi! Vou te mostrar tudo que dá pra fazer aqui.',
    titulo: 'Boas comidas aproximam boas pessoas.',
    texto: 'O VIMO é o seu diário gastronômico com amigos: descubra lugares, registre suas idas e veja onde a sua turma come.',
  },
  {
    reacao: 'explorando',
    animacao: 'flutuar',
    cor: '#E8EDFF',
    fala: 'Aqui você encontra restaurantes, cafés e bares perto de você.',
    titulo: 'Descubra lugares',
    texto: 'No Explorar e no Mapa você acha lugares da sua cidade com fotos e notas reais de quem foi.',
  },
  {
    reacao: 'avaliando',
    animacao: 'pular',
    cor: '#FFF5E6',
    fala: 'Toca no + azul. Avalio o café, o ambiente e o atendimento — passo a passo.',
    titulo: 'Registre suas idas',
    texto: 'Avalie cada critério e a nota geral é calculada automaticamente na hora.',
  },
  {
    reacao: 'apaixonado',
    animacao: 'flutuar',
    cor: '#EDFAF4',
    fala: 'Veja onde sua turma come, curta e salve lugares para visitar depois.',
    titulo: 'Coma bem com quem você segue',
    texto: 'Em Amigos você acompanha as idas de quem segue e descobre novos lugares pelas avaliações deles.',
  },
];

const ANIM_CSS = `
  @keyframes tut-bubble-pop {
    0%   { opacity:0; transform:scale(0.5) translateY(10px); }
    65%  { transform:scale(1.04) translateY(-3px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes tut-mascot-rise {
    from { opacity:0; transform:translateY(32px) scale(0.88); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes tut-text-in {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .tut-bubble { animation: tut-bubble-pop 0.44s cubic-bezier(0.34,1.56,0.64,1) both 0.15s; }
  .tut-mascot { animation: tut-mascot-rise 0.38s cubic-bezier(0.34,1.56,0.64,1) both; }
  .tut-text   { animation: tut-text-in 0.30s ease both 0.22s; }
`;

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
    <>
      <style>{ANIM_CSS}</style>

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

          {/* Header: logo + botão pular */}
          <div className="flex items-center justify-between px-6">
            <Logo altura={22} />
            {!ultimo ? (
              <button
                type="button"
                onClick={pular}
                className="h-9 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink cursor-pointer transition"
              >
                Pular
              </button>
            ) : (
              <span className="h-9" />
            )}
          </div>

          {/* Área do mascote com balão de fala */}
          <div
            className="relative mx-5 mt-5 rounded-3xl"
            style={{ height: 'min(58vw, 296px)' }}
          >
            {/* Fundo colorido com transição */}
            <div
              key={`bg-${idx}`}
              className="absolute inset-0 rounded-3xl transition-colors duration-500"
              style={{ background: passo.cor }}
            />

            {/* Mascote: entra suavemente de baixo */}
            <div
              key={`m-${idx}`}
              className="tut-mascot absolute bottom-0 left-1/2 -translate-x-1/2 z-10"
            >
              <Mascote reacao={passo.reacao} tamanho={168} animacao={passo.animacao} />
            </div>

            {/* Balão de fala: estoura de cima com mola */}
            <div
              key={`b-${idx}`}
              className="tut-bubble absolute left-5 right-5 top-5 z-20 pointer-events-none"
            >
              {/* filter:drop-shadow aplica sombra ao shape combinado (bolha + rabo) */}
              <div style={{ filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.10))' }}>
                <div className="relative bg-white rounded-2xl px-4 py-3">
                  <p className="text-[14px] font-semibold text-ink leading-snug">
                    {passo.fala}
                  </p>
                  {/* Rabo do balão apontando para o mascote (abaixo, centralizado) */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      bottom: -10,
                      width: 0,
                      height: 0,
                      borderLeft: '11px solid transparent',
                      borderRight: '11px solid transparent',
                      borderTop: '11px solid white',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Título e texto descritivo */}
          <div
            key={`txt-${idx}`}
            className={`tut-text flex-1 flex flex-col justify-start px-6 pt-5 animate-in ${
              dir > 0 ? 'slide-in-from-right' : 'slide-in-from-left'
            } duration-300`}
          >
            <h2 className="font-display text-[23px] font-bold leading-snug tracking-[-0.025em] text-ink">
              {passo.titulo}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted max-w-[340px]">
              {passo.texto}
            </p>
          </div>

          {/* Indicadores de progresso */}
          <div
            className="mb-5 flex justify-center gap-2 px-6"
            aria-label={`Passo ${idx + 1} de ${PASSOS.length}`}
          >
            {PASSOS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ir para o passo ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === idx ? 'w-8 bg-primary' : 'w-2 bg-s3'
                }`}
              />
            ))}
          </div>

          {/* CTAs */}
          <div className="px-6">
            {ultimo ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => concluir('explorar')}
                  className={`${btn.primary} w-full`}
                >
                  Começar a explorar
                </button>
                <button
                  type="button"
                  onClick={() => concluir('avaliar')}
                  className={`${btn.outline} h-12 w-full`}
                >
                  Registrar minha primeira ida
                </button>
                <button
                  type="button"
                  onClick={() => ir(idx - 1)}
                  className={`${btn.ghost} w-full`}
                >
                  Voltar
                </button>
              </div>
            ) : (
              <div className="flex gap-2.5">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => ir(idx - 1)}
                    className={`${btn.outline} h-12 flex-1`}
                  >
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => ir(idx + 1)}
                  className={`${btn.primary} flex-[2]`}
                >
                  {idx === 0 ? 'Começar' : 'Próximo'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
