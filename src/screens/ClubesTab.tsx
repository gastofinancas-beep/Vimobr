import { useEffect, useState } from 'react';
import { ChevronRight, Lock, Plus, Search } from 'lucide-react';
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

const membrosTexto = (n: number) => `${n} ${n === 1 ? 'membro' : 'membros'}`;

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
  const [rankingCompleto, setRankingCompleto] = useState(false);

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
  const abrir = (c: Clube) => onAbrirClube(c, posicaoDe(c.id));

  const meus = clubes.filter((c) => ehMembro(c, currentUser.uid));
  const termo = busca.trim().toLowerCase();
  const casa = (c: Clube) =>
    !termo || c.nome.toLowerCase().includes(termo) || (c.cidade ?? '').toLowerCase().includes(termo);
  const porMembros = [...clubes].sort((a, b) => b.membrosUids.length - a.membrosUids.length);
  const populares = porMembros.filter((c) => !c.privado).slice(0, 8);
  const publicos = porMembros.filter((c) => !c.privado && casa(c));
  const privados = porMembros.filter((c) => c.privado && casa(c));
  const destaque = placar.find((p) => !p.clube.privado && p.idas > 0) ?? null;
  const ranking = rankingCompleto ? placar : placar.slice(0, 5);

  if (clubes.length === 0) {
    return (
      <>
        <MascotMessage
          reaction="curioso"
          title="Nenhum clube ainda"
          subtitle="Crie o primeiro, chame seus amigos e disputem quem mais visita lugares no mês."
          ctaLabel="Criar clube"
          onCta={() => setCriando(true)}
        />
        {criando && <Criar currentUser={currentUser} onClose={() => setCriando(false)} onCriado={(c) => { setCriando(false); setClubes([c]); setPlacar(rankingLocalDosClubes([c])); onAbrirClube(c); }} />}
      </>
    );
  }

  return (
    <div className="pb-10">
      {meus.length > 0 && (
        <section className="pt-5">
          <h2 className="t-section px-4 mb-3 text-ink">Meus clubes</h2>
          <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
            {meus.map((c) => (
              <li key={c.id} className="w-[92px] shrink-0">
                <button type="button" onClick={() => abrir(c)} className="w-full text-left cursor-pointer">
                  <span className="relative block">
                    <EscudoClube nome={c.nome} tamanho={92} />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-line">
                      {c.criadorUid === currentUser.uid ? 'Criador' : 'Membro'}
                    </span>
                  </span>
                  <span className="mt-3.5 block truncate text-center text-[13px] font-semibold text-ink">{c.nome}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {destaque && (
        <section className="px-4 pt-6">
          <h2 className="t-section mb-3 text-ink">Destaque</h2>
          <button
            type="button"
            onClick={() => abrir(destaque.clube)}
            className="relative w-full overflow-hidden rounded-2xl bg-ink p-5 text-left text-bg cursor-pointer"
          >
            <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
              1º em {nomeDoMes()}
            </span>
            <EscudoClube nome={destaque.clube.nome} tamanho={44} />
            <span className="mt-3 block font-display text-[20px] font-bold leading-tight">{destaque.clube.nome}</span>
            {destaque.clube.descricao && (
              <span className="mt-1 block text-[14px] opacity-80 line-clamp-2">{destaque.clube.descricao}</span>
            )}
            <span className="mt-3 block text-[13px] opacity-70">
              {destaque.clube.cidade ? `${destaque.clube.cidade} · ` : ''}
              {membrosTexto(destaque.clube.membrosUids.length)} · {destaque.idas} {destaque.idas === 1 ? 'ida' : 'idas'} no mês
            </span>
          </button>
        </section>
      )}

      {populares.length > 0 && (
        <section className="pt-6">
          <h2 className="t-section px-4 mb-3 text-ink">Clubes populares</h2>
          <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {populares.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => abrir(c)}
                  className="flex w-[148px] flex-col gap-2 rounded-2xl bg-s1 p-3 text-left ring-1 ring-line cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <EscudoClube nome={c.nome} tamanho={48} />
                  <span className="w-full truncate text-[14px] font-semibold text-ink">{c.nome}</span>
                  <span className="truncate text-[12px] text-muted">
                    {membrosTexto(c.membrosUids.length)}
                    {c.cidade ? ` · ${c.cidade}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 pt-6">
        <h2 className="t-section mb-1 text-ink">Ranking de {nomeDoMes()}</h2>
        <p className="mb-3 text-sm text-muted">Clubes com mais idas registradas pelos membros neste mês.</p>
        <ol className="divide-y divide-line rounded-2xl bg-s1 ring-1 ring-line">
          {ranking.map((p, i) => (
            <li key={p.clube.id}>
              <button type="button" onClick={() => abrir(p.clube)} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
                <Posicao n={i + 1} />
                <EscudoClube nome={p.clube.nome} tamanho={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[14px] font-semibold text-ink">
                    <span className="truncate">{p.clube.nome}</span>
                    {p.clube.privado && <Lock size={12} strokeWidth={2.2} className="shrink-0 text-muted" />}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{membrosTexto(p.clube.membrosUids.length)}</span>
                </span>
                <span className="text-right">
                  <span className="block t-rating text-lg text-ink">{p.idas}</span>
                  <span className="block text-[11px] text-muted">{p.idas === 1 ? 'ida' : 'idas'}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {placar.length > 5 && (
          <button
            type="button"
            onClick={() => setRankingCompleto((v) => !v)}
            className="mt-2 text-sm font-semibold text-primary cursor-pointer"
          >
            {rankingCompleto ? 'Mostrar menos' : `Ver os ${placar.length} clubes`}
          </button>
        )}
      </section>

      <div className="relative px-4 pt-7">
        <Search size={16} className="pointer-events-none absolute left-8 top-[calc(1.75rem+22px)] -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar clube ou cidade"
          className={`${inputClass} h-11 pl-10`}
        />
      </div>

      <ListaClubes titulo="Clubes públicos" vazio="Nenhum clube público encontrado." clubes={publicos} uid={currentUser.uid} onAbrir={abrir} />
      <ListaClubes
        titulo="Clubes privados"
        descricao="Só entra quem recebe o código de convite de um membro."
        vazio="Nenhum clube privado encontrado."
        clubes={privados}
        uid={currentUser.uid}
        onAbrir={abrir}
      />

      <button
        type="button"
        onClick={() => setCriando(true)}
        aria-label="Criar clube"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        <Plus size={24} strokeWidth={2.2} className="text-white" />
      </button>

      {criando && (
        <Criar
          currentUser={currentUser}
          onClose={() => setCriando(false)}
          onCriado={(c) => {
            setCriando(false);
            const lista = [c, ...clubes.filter((x) => x.id !== c.id)];
            setClubes(lista);
            setPlacar(rankingLocalDosClubes(lista));
            onAbrirClube(c);
          }}
        />
      )}
    </div>
  );
}

function Criar(props: { currentUser: UserProfile; onClose: () => void; onCriado: (c: Clube) => void }) {
  return <CriarClubeModal {...props} />;
}

function ListaClubes({
  titulo,
  descricao,
  vazio,
  clubes,
  uid,
  onAbrir,
}: {
  titulo: string;
  descricao?: string;
  vazio: string;
  clubes: Clube[];
  uid: string;
  onAbrir: (c: Clube) => void;
}) {
  return (
    <section className="pt-6">
      <h2 className="t-section px-4 mb-1 text-ink">{titulo}</h2>
      {descricao && <p className="px-4 mb-2 text-sm text-muted">{descricao}</p>}
      {clubes.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-line">
          {clubes.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onAbrir(c)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-s2 transition-colors cursor-pointer">
                <EscudoClube nome={c.nome} tamanho={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{c.nome}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {membrosTexto(c.membrosUids.length)}
                    {c.cidade ? ` · ${c.cidade}` : ''}
                    {ehMembro(c, uid) ? ' · Você participa' : ''}
                  </span>
                </span>
                {c.privado && !ehMembro(c, uid) ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-s2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                    <Lock size={11} strokeWidth={2.2} />
                    Convite
                  </span>
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
