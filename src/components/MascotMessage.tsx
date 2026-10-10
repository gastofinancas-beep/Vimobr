import React from 'react';
import { btn } from './ui';
import { Mascote, type Reacao, type MascoteAnimacao } from './Mascote';

/**
 * Estado com mascote: vazio, sem resultado, sucesso e erro recuperável.
 * Aceita as reações novas e também os nomes antigos (convertidos para a pose
 * equivalente da identidade atual), para não quebrar telas existentes.
 */
export type MascotReaction =
  | Reacao
  // nomes antigos → convertidos abaixo
  | 'confuso'
  | 'incentivando'
  | 'social'
  | 'timido'
  | 'dormindo'
  | 'orgulhoso'
  | 'analisando'
  | 'preocupado'
  | 'bem_vindo'
  | 'triste'
  | 'amor'
  | 'comendo'
  | 'apontando'
  | 'feliz'
  | 'muito_feliz'
  | 'ideia'
  | 'bebendo'
  | 'carregando'
  | 'joinha'
  | 'duvida'
  | 'alerta'
  | 'vitoria'
  | 'foco'
  | 'lendo'
  | 'agradecendo';

const EQUIVALENTE: Record<string, Reacao> = {
  confuso: 'pensativo',
  duvida: 'pensativo',
  analisando: 'buscando',
  ideia: 'pensativo',
  lendo: 'pensativo',
  incentivando: 'animado',
  muito_feliz: 'animado',
  feliz: 'feliz',
  joinha: 'confiante',
  apontando: 'explorando',
  social: 'socializando',
  timido: 'curioso',
  foco: 'curioso',
  carregando: 'carregando',
  dormindo: 'tranquilo',
  orgulhoso: 'impressionado',
  vitoria: 'impressionado',
  preocupado: 'decepcionado',
  triste: 'decepcionado',
  alerta: 'surpreso',
  bem_vindo: 'boas-vindas',
  amor: 'apaixonado',
  agradecendo: 'apaixonado',
  comendo: 'degustando',
  bebendo: 'degustando',
};

export type MascotAnimacao = MascoteAnimacao;

interface MascotMessageProps {
  reaction: MascotReaction;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Tamanho em px (padrão 88). */
  size?: number;
  /** Movimento do mascote. Padrão: definido pela reação. */
  animacao?: MascotAnimacao;
  className?: string;
}

export default function MascotMessage({
  reaction,
  title,
  subtitle,
  ctaLabel,
  onCta,
  size = 88,
  className = '',
  animacao,
}: MascotMessageProps) {
  const reacao = (EQUIVALENTE[reaction] ?? reaction) as Reacao;
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
      <Mascote reacao={reacao} tamanho={Math.min(size, 96)} animacao={animacao} />

      <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{title}</h3>

      {subtitle && <p className="mt-1.5 max-w-[280px] text-sm text-muted">{subtitle}</p>}

      {ctaLabel && onCta && (
        <button type="button" onClick={onCta} className={`${btn.primary} mt-6`}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
