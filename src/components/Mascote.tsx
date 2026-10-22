import React, { useSyncExternalStore } from 'react';
import { OLHOS, PROPORCAO_PRINCIPAL } from '../lib/mascoteOlhos';

/**
 * Mascote do VIMO (gralha preta e azul da identidade oficial).
 * Arquivos em /public/mascote/, recortados da prancha oficial com fundo transparente
 * e conferidos um a um (sem os recortes defeituosos do pacote).
 *
 * Uso contextual:
 *  curioso / explorando / buscando → descobrir lugares, mapa, busca
 *  animado / impressionado          → lugar interessante, conquistas
 *  avaliando / registrando          → registrar ida, fotos
 *  comemorando / sucesso            → ação concluída
 *  pensativo                        → orientar, busca sem resultado
 *  compartilhando / socializando    → amigos
 *  salvando / apaixonado            → Quero ir, favoritos
 *  degustando                       → diário
 *  tranquilo                        → nada novo (notificações)
 *  decepcionado / erro              → erro recuperável
 *  carregando                       → carregamento longo
 *  boas-vindas / tchau              → entrada e saída
 *  focado / dormindo                → planejando / nada acontecendo
 *  ranking / vitoria / trofeu / primeiro-lugar / desafio → clubes e competição
 *
 * Assinantes PRO veem o mascote todo preto (/public/mascote/pro/), com reações próprias.
 */
export type Reacao =
  | 'curioso'
  | 'confiante'
  | 'animado'
  | 'pensativo'
  | 'surpreso'
  | 'tranquilo'
  | 'comemorando'
  | 'degustando'
  | 'apaixonado'
  | 'explorando'
  | 'registrando'
  | 'avaliando'
  | 'compartilhando'
  | 'salvando'
  | 'socializando'
  | 'impressionado'
  | 'decepcionado'
  | 'sucesso'
  | 'erro'
  | 'boas-vindas'
  | 'tchau'
  | 'buscando'
  | 'feliz'
  | 'rindo'
  | 'desconfiado'
  | 'carregando'
  | 'focado'
  | 'dormindo'
  | 'ranking'
  | 'vitoria'
  | 'trofeu'
  | 'primeiro-lugar'
  | 'desafio'
  | 'pro';

/** Reação → arquivo em /public/mascote/ (nomes da prancha oficial). */
const ARQUIVO: Record<Reacao, string> = {
  curioso: 'curioso',
  confiante: 'confiante',
  animado: 'animado',
  pensativo: 'pensativo',
  surpreso: 'surpreso',
  tranquilo: 'neutro',
  comemorando: 'celebrando',
  degustando: 'comendo',
  apaixonado: 'apaixonado',
  explorando: 'explorando',
  registrando: 'fotografando',
  avaliando: 'avaliando',
  compartilhando: 'compartilhando',
  salvando: 'salvando',
  socializando: 'compartilhando',
  impressionado: 'impressionado',
  decepcionado: 'decepcionado',
  sucesso: 'sucesso',
  erro: 'erro',
  'boas-vindas': 'boas-vindas',
  tchau: 'ate-logo',
  buscando: 'buscando',
  feliz: 'feliz',
  rindo: 'rindo',
  desconfiado: 'desconfiado',
  carregando: 'carregando',
  focado: 'focado',
  dormindo: 'dormindo',
  ranking: 'confiante',
  vitoria: 'celebrando',
  trofeu: 'impressionado',
  'primeiro-lugar': 'celebrando',
  desafio: 'confiante',
  pro: 'confiante',
};

/** Reação → arquivo do mascote PRO (todo preto) em /public/mascote/pro/. */
const ARQUIVO_PRO: Record<Reacao, string> = {
  curioso: 'pensativo',
  confiante: 'confiante',
  animado: 'celebrando',
  pensativo: 'pensativo',
  surpreso: 'surpreso',
  tranquilo: 'descansando',
  comemorando: 'celebrando',
  degustando: 'aprovado',
  apaixonado: 'apaixonado',
  explorando: 'explorando',
  registrando: 'novo-lugar',
  avaliando: 'aprovado',
  compartilhando: 'debochado',
  salvando: 'novo-lugar',
  socializando: 'rivalidade',
  impressionado: 'orgulhoso',
  decepcionado: 'perdeu-por-pouco',
  sucesso: 'aprovado',
  erro: 'bravo',
  'boas-vindas': 'pro',
  tchau: 'to-on',
  buscando: 'focado',
  feliz: 'risada',
  rindo: 'risada',
  desconfiado: 'debochado',
  carregando: 'determinado',
  focado: 'focado',
  dormindo: 'descansando',
  ranking: 'ranking',
  vitoria: 'vitoria',
  trofeu: 'trofeu',
  'primeiro-lugar': 'primeiro-lugar',
  desafio: 'desafio',
  pro: 'pro',
};

// Versão do mascote do usuário logado: o App liga quando a pessoa é PRO
let mascotePro = false;
const ouvintes = new Set<() => void>();

export function definirMascotePro(ativo: boolean) {
  if (ativo === mascotePro) return;
  mascotePro = ativo;
  ouvintes.forEach((f) => f());
}

function useMascotePro(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => mascotePro,
    () => false,
  );
}

const caminho = (r: Reacao, pro: boolean) => (pro ? `pro/${ARQUIVO_PRO[r]}` : ARQUIVO[r]);

export const urlMascote = (r: Reacao, pro = mascotePro) => `/mascote/${caminho(r, pro)}.png`;

export type MascoteAnimacao = 'flutuar' | 'respirar' | 'pular' | 'inclinar' | 'orgulho' | 'entrar' | 'nenhuma';

/** Movimento padrão de cada reação: o gesto combina com o que o mascote "sente". */
const MOVIMENTO: Partial<Record<Reacao, MascoteAnimacao>> = {
  dormindo: 'respirar',
  vitoria: 'pular',
  'primeiro-lugar': 'orgulho',
  trofeu: 'orgulho',
  tranquilo: 'respirar',
  comemorando: 'pular',
  sucesso: 'pular',
  pensativo: 'inclinar',
  surpreso: 'inclinar',
  buscando: 'inclinar',
  impressionado: 'orgulho',
  animado: 'orgulho',
  apaixonado: 'pular',
};

type EstadoOlhos = 'piscando' | 'abertos' | 'fechados';

/** Pálpebras na cor do corpo, posicionadas sobre o branco dos olhos. */
function Palpebras({ arquivo, estado }: { arquivo: string; estado: EstadoOlhos }) {
  const olhos = OLHOS[arquivo];
  if (!olhos || estado === 'abertos') return null;
  const classe = estado === 'fechados' ? 'mascote-palpebra fechada' : 'mascote-palpebra';
  // recorta as pálpebras pelo próprio desenho: nada passa do contorno da cabeça
  const mascara = `url(/mascote/${arquivo}.png)`;
  return (
    <span
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: mascara,
        WebkitMaskImage: mascara,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    >
      {olhos.map(([l, t, w, h], i) => (
        <span
          key={i}
          className={classe}
          // a pálpebra cobre o olho com uma pequena sobra para não deixar borda branca
          style={{ left: `${l - 1.6}%`, top: `${t - 1.6}%`, width: `${w + 3.2}%`, height: `${h + 3.2}%`, animationDelay: `${1.2 + i * 0.04}s` }}
        />
      ))}
    </span>
  );
}

export function Mascote({
  reacao,
  tamanho = 72,
  animacao,
  piscar = true,
  pro,
  className = '',
}: {
  reacao: Reacao;
  /** Força a versão PRO (true) ou a normal (false). Sem valor, segue o plano do usuário. */
  pro?: boolean;
  /** Lado do quadro em px (os arquivos têm 224 px, nítidos até ~112). */
  tamanho?: number;
  animacao?: MascoteAnimacao;
  /** Pisca de vez em quando (desligado com movimento reduzido). */
  piscar?: boolean;
  className?: string;
}) {
  const proDoUsuario = useMascotePro();
  const versaoPro = pro ?? proDoUsuario;
  const mov = animacao ?? MOVIMENTO[reacao] ?? 'flutuar';
  const arquivo = caminho(reacao, versaoPro);
  return (
    <span
      aria-hidden="true"
      className={`mascote-disco inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className={`mascote relative block ${mov !== 'nenhuma' ? `mascote-${mov}` : ''}`}
        style={{ width: '88%', height: '88%' }}
      >
        <img
          src={`/mascote/${arquivo}.png`}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-contain"
        />
        {!versaoPro && <Palpebras arquivo={arquivo} estado={piscar ? 'piscando' : 'abertos'} />}
      </span>
    </span>
  );
}

/**
 * Mascote grande (arte principal da prancha) com piscada.
 * `olhosFechados` mantém os olhos fechados (ex.: enquanto digita a senha).
 */
export function MascoteHero({
  tamanho = 200,
  olhosFechados = false,
  piscar = true,
  animacao = 'entrar',
  className = '',
}: {
  tamanho?: number;
  olhosFechados?: boolean;
  piscar?: boolean;
  animacao?: MascoteAnimacao;
  className?: string;
}) {
  const pro = useMascotePro();
  const estado: EstadoOlhos = olhosFechados ? 'fechados' : piscar ? 'piscando' : 'abertos';
  if (pro) return <Mascote reacao="pro" tamanho={tamanho} animacao={animacao} pro className={className} />;
  return (
    <span
      aria-hidden="true"
      className={`mascote-disco relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className={`mascote relative block ${animacao !== 'nenhuma' ? `mascote-${animacao}` : ''}`}
        style={{ width: '84%', aspectRatio: String(PROPORCAO_PRINCIPAL) }}
      >
        <img src="/mascote/principal.png" alt="" draggable={false} className="h-full w-full select-none" />
        <Palpebras arquivo="principal" estado={estado} />
      </span>
    </span>
  );
}

export default Mascote;
