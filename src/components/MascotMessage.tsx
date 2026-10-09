import React from 'react';

/**
 * Mapeamento de reações do mascote para os PNGs em /public/mascot/
 */
export type MascotReaction =
  | 'explorando'   // com mapa — empty feeds, buscar
  | 'pensando'     // pensativo — sem resultados
  | 'triste'       // tristinho — erros, sem conteúdo
  | 'comemorando'  // confete — sucesso, conquista
  | 'amor'         // coração — favoritos, curtidas
  | 'comendo'      // comendo — empty reviews
  | 'incentivando' // incentivando — CTA, motivação
  | 'bem_vindo'    // boas-vindas — onboarding
  | 'curioso'      // curioso — loading, descoberta
  | 'dormindo'     // dormindo — sem notificações
  | 'apontando'    // apontando — dicas, guia
  | 'feliz'        // sorrindo — confirmação
  | 'muito_feliz'  // super feliz — primeiro review
  | 'confuso'      // confuso — 404, não encontrado
  | 'ideia'        // lâmpada — sugestões
  | 'social'       // social — amigos
  | 'bebendo'      // bebendo — bares
  | 'analisando'   // analisando — stats
  | 'sucesso'      // sucesso — publicação
  | 'tchau'        // tchau — logout
  | 'carregando'   // loading
  | 'joinha'       // like/confirm
  | 'surpreso'     // surpresa
  | 'duvida'       // dúvida
  | 'timido'       // tímido
  | 'erro'         // erro
  | 'alerta'       // alerta
  | 'vitoria'      // vitória
  | 'orgulhoso'    // orgulhoso
  | 'foco'         // focado
  | 'lendo'        // lendo
  | 'agradecendo'; // agradecido

interface MascotMessageProps {
  /** Reação do mascote */
  reaction: MascotReaction;
  /** Título principal */
  title: string;
  /** Subtítulo/descrição */
  subtitle?: string;
  /** Texto do botão CTA */
  ctaLabel?: string;
  /** Ação do botão CTA */
  onCta?: () => void;
  /** Tamanho do mascote (px) */
  size?: number;
  /** Classes extras no container */
  className?: string;
}

export default function MascotMessage({
  reaction,
  title,
  subtitle,
  ctaLabel,
  onCta,
  size = 120,
  className = '',
}: MascotMessageProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-8 text-center ${className}`}>
      <img
        src={`/mascot/vimo_${reaction}.png`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="object-contain drop-shadow-lg"
        loading="lazy"
      />

      <h3 className="mt-2 text-[15px] font-semibold text-[var(--ink)] leading-snug">
        {title}
      </h3>

      {subtitle && (
        <p className="max-w-[260px] text-[13px] leading-relaxed text-[var(--muted)]">
          {subtitle}
        </p>
      )}

      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-[13px] font-semibold text-[var(--on-primary)] transition active:scale-[0.97]"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
