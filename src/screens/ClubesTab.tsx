import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import CriarClubeModal, { EscudoClube } from '../components/CriarClubeModal';
import MascotMessage from '../components/MascotMessage';
import { inputClass } from '../components/ui';
import { Posicao } from './ClubeScreen';
import {
  carregarClubes,
  clubesLocais,
  ehMembro,
  nomeDoMes,
  rankingDosClubes,
  rankingLocalDosClubes,
  type PlacarClube,
} from '../lib/clubes';
import type { Clube, UserProfile } from '../types';

export default function ClubesTab({
  currentUser,
  onAbrirClube,
}: {
  currentUser: UserProfile;
  onAbrirClube: (clube: Clube, posicao?: number) => void;
}) {
  const [clubes, setClubes] = useState<Clube[]>(() => clubesLocais());
  const [placar, setPlacar] = useState<PlacarClube[]>(() => rankingLocalDosClubes(clubesLocais()));
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    carregarClubes().then(async (lista) => {
      if (!ativo) return;
      setClubes(lista);
      setPlacar(rankingLocalDosClubes(lista));
      const r = await rankingDosClubes(lista).catch(() => null);
      if (ativo && r) setPlacar(r);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const posicaoDe = (id: string) => {
    const i = placar.findIndex((p) => p.clube.id === id);
    return i >= 0 ? i + 1 : undefined;
  };

  const meus = clubes.filter((c) => ehMembro(c, currentUser.uid));
  const termo = busca.trim().toLowerCase();
  const ranking = placar.filter(
    (p) => !termo || p.clube.nome.toLowerCase().includes(termo) || (p.clube.cidade ?? '').toLowerCase().includes(termo),
  );

  return (
    <div className="pb-6">
      {meus.length > 0 && (
        <section className="pt-4">
          <h2 className="t-section text-ink px-4 mb-3">Meus clubes</h2>
          <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {meus.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onAbrirClube(c, posicaoDe(c.id))}
                  className="flex w-[132px] flex-col items-start gap-2 rounded-2xl bg-s1 p-3 text-left ring-1 ring-line cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <EscudoClube nome={c.nome} tamanho={44} />
                  <span className="w-full truncate text-[14px] font-semibold text-ink">{c.nome}</span>
                  <span className="text-[12px] text-muted">
                    {posicaoDe(c.id) ? `${posicaoDe(c.id)}º no mês` : `${c.membrosUids.length} membros`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.2} />
          Criar clube
        </button>
      </div>

      <section className="pt-6">
        <div className="px-4 mb-1 flex items-baseline justify-between">
          <h2 className="t-section text-ink">Ranking de {nomeDoMes()}</h2>
        </div>
        <p className="px-4 mb-3 text-sm text-muted">Clubes com mais idas registradas pelos membros neste mês.</p>

        {clubes.length > 3 && (
          <div className="relative px-4 mb-3">
            <Search size={16} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar clube ou cidade"
              className={`${inputClass} h-11 pl-10`}
            />
          </div>
        )}

        {clubes.length === 0 ? (
          <MascotMessage
            reaction="curioso"
            title="Nenhum clube ainda"
            subtitle="Crie o primeiro e chame seus amigos para competir."
          />
        ) : ranking.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Nenhum clube encontrado.</p>
        ) : (
          <ol className="mx-4 divide-y divide-line rounded-2xl bg-s1 ring-1 ring-line">
            {ranking.map((p) => {
              const pos = posicaoDe(p.clube.id)!;
              const souMembro = ehMembro(p.clube, currentUser.uid);
              return (
                <li key={p.clube.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirClube(p.clube, pos)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                  >
                    <Posicao n={pos} />
                    <EscudoClube nome={p.clube.nome} tamanho={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{p.clube.nome}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {p.clube.membrosUids.length} {p.clube.membrosUids.length === 1 ? 'membro' : 'membros'}
                        {p.clube.cidade ? ` · ${p.clube.cidade}` : ''}
                        {souMembro ? ' · Você participa' : ''}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block t-rating text-lg text-ink">{p.idas}</span>
                      <span className="block text-[11px] text-muted">{p.idas === 1 ? 'ida' : 'idas'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {criando && (
        <CriarClubeModal
          currentUser={currentUser}
          onClose={() => setCriando(false)}
          onCriado={(c) => {
            setCriando(false);
            setClubes((prev) => {
              const lista = [c, ...prev.filter((x) => x.id !== c.id)];
              setPlacar(rankingLocalDosClubes(lista));
              return lista;
            });
            onAbrirClube(c);
          }}
        />
      )}
    </div>
  );
}
