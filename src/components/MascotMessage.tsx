import React from 'react';
import { btn } from './ui';

/**
 * Mascote em momentos com propósito: estados vazios, busca sem resultado,
 * sucesso de uma ação e erro recuperável. Nunca em carregamentos ou ao lado de botões.
 *
 * Guia de expressões (arquivos em /public/mascot/):
 *  explorando   → nada por perto, lista "Quero ir" vazia, pedir localização
 *  confuso      → busca sem resultado, lugar não encontrado
 *  incentivando → primeira avaliação, diário vazio
 *  social       → ainda não segue ninguém / feed de amigos vazio
 *  timido       → sem comentários ainda
 *  dormindo     → sem notificações
 *  comemorando  → avaliação publicada
 *  orgulhoso    → conquistas
 *  analisando   → paladar sem dados suficientes
 *  preocupado   → erro recuperável (falha ao carregar, sem conexão)
 *  bem_vindo    → boas-vindas / onboarding
 */
export type MascotReaction =
  | 'explorando'
  | 'confuso'
  | 'incentivando'
  | 'social'
  | 'timido'
  | 'dormindo'
  | 'comemorando'
  | 'orgulhoso'
  | 'analisando'
  | 'preocupado'
  | 'bem_vindo'
  // expressões mantidas por compatibilidade
  | 'pensando'
  | 'triste'
  | 'amor'
  | 'comendo'
  | 'curioso'
  | 'apontando'
  | 'feliz'
  | 'muito_feliz'
  | 'ideia'
  | 'bebendo'
  | 'sucesso'
  | 'tchau'
  | 'carregando'
  | 'joinha'
  | 'surpreso'
  | 'duvida'
  | 'erro'
  | 'alerta'
  | 'vitoria'
  | 'foco'
  | 'lendo'
  | 'agradecendo';

interface MascotMessageProps {
  reaction: MascotReaction;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Tamanho em px. Limitado a 72 para manter o PNG nítido. */
  size?: number;
  className?: string;
}

export default function MascotMessage({
  reaction,
  title,
  subtitle,
  ctaLabel,
  onCta,
  size = 72,
  className = '',
}: MascotMessageProps) {
  const px = Math.min(size, 72);
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
      <img
        src={`/mascot/vimo_${reaction}.png`}
        alt=""
        aria-hidden="true"
        width={px}
        height={Math.round(px * 1.045)}
        className="object-contain select-none"
        loading="lazy"
        draggable={false}
      />

      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>

      {subtitle && (
        <p className="mt-1.5 max-w-[280px] text-sm text-muted">{subtitle}</p>
      )}

      {ctaLabel && onCta && (
        <button type="button" onClick={onCta} className={`${btn.primary} mt-5`}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
