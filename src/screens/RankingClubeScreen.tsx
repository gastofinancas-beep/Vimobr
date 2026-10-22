import React, { useEffect, useState } from 'react';
import { ChevronLeft, Share } from 'lucide-react';
import { Mascote } from '../components/Mascote';
import { mostrarAviso } from '../components/Aviso';
import { Avatar } from '../components/ui';
import {
  infoPontuacao,
  nomeDoMes,
  rankingDoClube,
  rankingLocalDoClube,
  unidadePontos,
  type PeriodoRanking,
  type PlacarMembro,
} from '../lib/clubes';
import type { Clube, UserProfile } from '../types';

/** Ranking interno do clube: pódio dos três primeiros e as demais posições. */
export default function RankingClubeScreen({
  clube,
  currentUser,
  onVoltar,
  onAbrirPerfil,
}: {
  clube: Clube;
  currentUser: UserProfile;
  onVoltar: () => void;
  onAbrirPerfil: (uid: string) => void;
}) {
  const [periodo, setPeriodo] = useState<PeriodoRanking>('mensal');
  const [placar, setPlacar] = useState<PlacarMembro[]>(() => rankingLocalDoClube(clube, 'mensal'));

  useEffect(() => {
    let ativo = true;
    setPlacar(rankingLocalDoClube(clube, periodo));
    rankingDoClube(clube, periodo)
      .then((r) => ativo && setPlacar(r))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [clube, periodo]);

  const pont = infoPontuacao(clube.pontuacao);
  const [primeiro, segundo, terceiro] = placar;
  const demais = placar.slice(3);
  const souLider = !!primeiro && primeiro.valor > 0 && primeiro.membro.uid === currentUser.uid;
  const ninguemPontuou = !primeiro || primeiro.valor === 0;
  const legenda = periodo === 'mensal' ? `${pont.titulo} em ${nomeDoMes()}` : `${pont.titulo} desde a criação do clube`;

  const compartilhar = async () => {
    const linhas = placar
      .slice(0, 10)
      .map((p, i) => `${i + 1}. ${p.membro.name} · ${p.valor} ${unidadePontos(clube.pontuacao, p.valor)}`);
    const texto = `Ranking ${periodo === 'mensal' ? `de ${nomeDoMes()}` : 'geral'} do clube ${clube.nome} no Vimo\n${linhas.join('\n')}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Ranking ${clube.nome}`, text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      mostrarAviso('Ranking copiado');
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      mostrarAviso('Não foi possível compartilhar agora');
    }
  };

  return (
    <div className="min-h-screen w-full flex-1 bg-bg pb-28 text-ink">
      <header className="mx-auto grid max-w-2xl grid-cols-[48px_1fr_48px] items-center px-4 pt-4">
        <button
          type="button"
          onClick={onVoltar}
          aria-label="Voltar"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-ink shadow-sm ring-1 ring-line cursor-pointer"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <div role="tablist" aria-label="Período" className="mx-auto flex rounded-full bg-s1 p-1 shadow-sm ring-1 ring-line">
          {(['mensal', 'geral'] as PeriodoRanking[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`h-9 rounded-full px-5 text-[15px] font-semibold transition-colors cursor-pointer ${
                periodo === p ? 'bg-bg text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {p === 'mensal' ? 'Mensal' : 'Geral'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={compartilhar}
          aria-label="Compartilhar ranking"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-ink shadow-sm ring-1 ring-line cursor-pointer"
        >
          <Share size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="mx-auto max-w-2xl">
        <p className="mt-3 text-center text-[13px] text-muted">{legenda}</p>

        {/* Pódio */}
        <section className="mt-5 grid grid-cols-3 items-end">
          <Degrau placar={segundo} posicao={2} clube={clube} onAbrirPerfil={onAbrirPerfil} />
          <Degrau placar={primeiro} posicao={1} clube={clube} onAbrirPerfil={onAbrirPerfil}>
            <Mascote reacao={ninguemPontuou ? 'desafio' : souLider ? 'primeiro-lugar' : 'trofeu'} tamanho={84} className="mb-2" />
          </Degrau>
          <Degrau placar={terceiro} posicao={3} clube={clube} onAbrirPerfil={onAbrirPerfil} />
        </section>

        {ninguemPontuou && (
          <p className="px-6 pt-4 text-center text-[14px] text-muted">
            Ninguém pontuou {periodo === 'mensal' ? `em ${nomeDoMes()}` : 'ainda'}. {pont.descricao}
          </p>
        )}

        {demais.length > 0 && (
          <section className="px-4 pt-6">
            <h2 className="mb-1 text-[15px] font-semibold text-muted">Demais posições</h2>
            <ol className="divide-y divide-line">
              {demais.map((p, i) => {
                const eu = p.membro.uid === currentUser.uid;
                return (
                  <li key={p.membro.uid}>
                    <button
                      type="button"
                      onClick={() => onAbrirPerfil(p.membro.uid)}
                      className="flex w-full items-center gap-4 py-3.5 text-left cursor-pointer"
                    >
                      <span className="w-8 shrink-0 font-display text-[17px] font-semibold text-ink-2 tabular">
                        {String(i + 4).padStart(2, '0')}
                      </span>
                      <Avatar src={p.membro.photo} name={p.membro.name} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold text-ink">{p.membro.name}</span>
                        {eu && <span className="block text-[12px] font-semibold text-primary">Você</span>}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-[22px] font-bold leading-none text-ink tabular">{p.valor}</span>
                        <span className="block text-[12px] text-muted">{unidadePontos(clube.pontuacao, p.valor)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

const ANEL: Record<number, string> = {
  1: 'ring-[3px] ring-primary',
  2: 'ring-[3px] ring-ink',
  3: 'ring-[3px] ring-line',
};

const ALTURA_DEGRAU: Record<number, string> = { 1: 'h-[116px]', 2: 'h-[76px]', 3: 'h-[52px]' };

function Degrau({
  placar,
  posicao,
  clube,
  onAbrirPerfil,
  children,
}: {
  placar?: PlacarMembro;
  posicao: number;
  clube: Clube;
  onAbrirPerfil: (uid: string) => void;
  children?: React.ReactNode;
}) {
  const tamanho = posicao === 1 ? 92 : 74;
  return (
    <div className="flex min-w-0 flex-col items-stretch">
      <div className="flex min-w-0 flex-col items-center px-1 pb-3">
        {placar ? (
          <button
            type="button"
            onClick={() => onAbrirPerfil(placar.membro.uid)}
            className="flex w-full min-w-0 flex-col items-center cursor-pointer"
            aria-label={`${posicao}º lugar: ${placar.membro.name}`}
          >
            <span className={`rounded-full p-[3px] ${ANEL[posicao]}`}>
              <Avatar src={placar.membro.photo} name={placar.membro.name} size={tamanho} />
            </span>
            <span className="mt-2.5 w-full truncate text-center text-[15px] font-semibold text-ink">{placar.membro.name}</span>
            <span className="mt-1 font-display text-[26px] font-bold leading-none text-ink tabular">{placar.valor}</span>
            <span className="text-[12px] text-muted">{unidadePontos(clube.pontuacao, placar.valor)}</span>
          </button>
        ) : (
          <>
            <span className="rounded-full border-2 border-dashed border-line" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />
            <span className="mt-2.5 text-[13px] text-muted">{posicao}º lugar</span>
          </>
        )}
      </div>
      <div
        className={`flex items-end justify-center bg-gradient-to-b ${ALTURA_DEGRAU[posicao]} ${
          posicao === 1 ? 'from-primary/5 to-primary/20 shadow-[0_-1px_0_var(--line)]' : 'from-primary/10 to-primary/20'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
