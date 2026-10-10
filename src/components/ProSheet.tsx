import React, { useState } from 'react';
import { Award, BadgeCheck, X, Zap } from 'lucide-react';
import { Mascote } from './Mascote';
import { btn } from './ui';
import { useEscape } from '../hooks/useEscape';
import { jaDemonstrouInteresse, registrarInteressePro } from '../lib/plano';

const BENEFICIOS = [
  { Icon: Award, titulo: 'Medalhas no perfil', texto: 'Suas conquistas em destaque para quem visita seu perfil.' },
  { Icon: BadgeCheck, titulo: 'Selo PRO', texto: 'Um selo ao lado do seu nome em todo o app.' },
  { Icon: Zap, titulo: 'Novidades primeiro', texto: 'Os próximos recursos do PRO chegam antes para você.' },
];

/** Apresenta o VIMO PRO. Enquanto o pagamento não existe, registra o interesse. */
export default function ProSheet({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [enviado, setEnviado] = useState(jaDemonstrouInteresse());
  useEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pro"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-s1 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl animate-in slide-in-from-bottom sm:rounded-3xl"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-s3 sm:hidden" />
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Fechar" className={btn.icon}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <Mascote reacao="impressionado" tamanho={84} />
          <p className="mt-3 inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-xs font-bold tracking-wide text-white">
            VIMO PRO
          </p>
          <h2 id="titulo-pro" className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
            Seu perfil com medalhas
          </h2>
          <p className="mt-1.5 max-w-[300px] text-sm text-muted">
            Mostre o que você já conquistou comendo por aí.
          </p>
        </div>

        <ul className="mt-6 space-y-4">
          {BENEFICIOS.map(({ Icon, titulo, texto }) => (
            <li key={titulo} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon size={19} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{titulo}</p>
                <p className="text-sm text-muted">{texto}</p>
              </div>
            </li>
          ))}
        </ul>

        {enviado ? (
          <p role="status" className="mt-7 rounded-2xl bg-s2 px-4 py-3.5 text-center text-sm font-medium text-ink-2">
            Pronto. Avisamos você assim que o PRO abrir.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              registrarInteressePro(uid);
              setEnviado(true);
            }}
            className={`${btn.primary} mt-7 w-full`}
          >
            Quero ser PRO
          </button>
        )}
        <p className="mt-3 text-center text-xs text-muted">O PRO ainda está chegando. Nenhuma cobrança será feita agora.</p>
      </div>
    </div>
  );
}
