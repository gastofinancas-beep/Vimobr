import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import FeedReviewCard from '../components/FeedReviewCard';
import CommentsSheet from '../components/CommentsSheet';
import ShareReviewModal from '../components/ShareReviewModal';
import {
  alternarListaUsuario,
  carregarComunidade,
  carregarExplorar,
  idsSeguindo,
  obterListasUsuario,
  seguir,
} from '../lib/reviews';
import type { FeedMode, Review, UserProfile } from '../types';

interface AmigosScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
  onAbrirAvaliar: () => void;
}

type Aba = 'seguindo' | 'descobrir';

const FILTROS: { key: FeedMode; label: string }[] = [
  { key: 'cidade', label: 'Minha cidade' },
  { key: 'outra', label: 'Outra cidade' },
  { key: 'algoritmo', label: 'Para você' },
];

export default function AmigosScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca,
  onAbrirAvaliar,
}: AmigosScreenProps) {
  const [aba, setAba] = useState<Aba>('seguindo');
  const [filtro, setFiltro] = useState<FeedMode>('cidade');
  const [cidadeOutra, setCidadeOutra] = useState('');
  const [cidades, setCidades] = useState<{ key: string; nome: string }[]>([]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [seguindoIds, setSeguindoIds] = useState<Set<string>>(new Set());
  const [salvos, setSalvos] = useState<Record<string, boolean>>({});

  const [comentarios, setComentarios] = useState<Review | null>(null);
  const [compartilhar, setCompartilhar] = useState<Review | null>(null);

  // Lista de cidades disponíveis (para "Outra cidade")
  useEffect(() => {
    if (aba !== 'descobrir' || filtro !== 'outra') return;
    carregarExplorar('algoritmo', currentUser.uid).then((todas) => {
      const mapa = new Map<string, string>();
      todas.forEach((r) => {
        if (r.cityKey && r.cityKey !== currentUser.homeCityKey) mapa.set(r.cityKey, r.cityName);
      });
      setCidades([...mapa.entries()].map(([key, nome]) => ({ key, nome })));
    });
  }, [aba, filtro, currentUser.uid, currentUser.homeCityKey]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setSeguindoIds(new Set(await idsSeguindo(currentUser.uid)));

      let lista: Review[] = [];
      if (aba === 'seguindo') {
        lista = await carregarComunidade(currentUser.uid);
      } else if (filtro === 'cidade') {
        lista = await carregarExplorar('cidade', currentUser.uid, currentUser.homeCityKey);
      } else if (filtro === 'outra') {
        lista = cidadeOutra ? await carregarExplorar('outra', currentUser.uid, cidadeOutra) : [];
      } else {
        lista = await carregarExplorar('algoritmo', currentUser.uid);
      }
      setReviews(lista);

      const listas = obterListasUsuario(currentUser.uid);
      const mapa: Record<string, boolean> = {};
      (listas.queroIr as string[]).forEach((id) => (mapa[id] = true));
      setSalvos(mapa);
    } finally {
      setCarregando(false);
    }
  }, [aba, filtro, cidadeOutra, currentUser.uid, currentUser.homeCityKey]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleSalvar = (r: Review) => {
    const adicionado = alternarListaUsuario(currentUser.uid, 'queroIr', r.placeId);
    setSalvos((s) => ({ ...s, [r.placeId]: adicionado }));
  };

  const handleSeguir = async (alvo: string) => {
    await seguir(currentUser.uid, alvo);
    setSeguindoIds((s) => new Set(s).add(alvo));
  };

  return (
    <div className="flex-1 w-full bg-[var(--bg)] text-[var(--ink)] min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-3">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-medium text-[var(--ink)]">Amigos</h1>
          <button
            type="button"
            onClick={onAbrirBusca}
            aria-label="Buscar pessoas"
            className="w-11 h-11 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
          >
            <Search size={22} />
          </button>
        </header>

        {/* Abas "Quem eu sigo" / "Descobrir" com sublinhado */}
        <div
          role="tablist"
          aria-label="Tipo de feed"
          className="flex border-b border-[var(--line)]"
        >
          {(['seguindo', 'descobrir'] as Aba[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`flex-1 min-h-11 pb-2 text-sm text-center transition cursor-pointer ${
                aba === a
                  ? 'text-[var(--ink)] font-medium border-b-2 border-[var(--primary)] -mb-px'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] font-normal'
              }`}
            >
              {a === 'seguindo' ? 'Quem eu sigo' : 'Descobrir'}
            </button>
          ))}
        </div>

        {/* Filtros (apenas na aba Descobrir) */}
        {aba === 'descobrir' && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {FILTROS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filtro === f.key}
                  onClick={() => setFiltro(f.key)}
                  className={`min-h-11 px-4 rounded-xl text-[13px] whitespace-nowrap cursor-pointer transition ${
                    filtro === f.key
                      ? 'bg-[var(--primary)] text-[var(--on-primary)] font-medium shadow-2xs'
                      : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filtro === 'outra' && (
              <div>
                <label htmlFor="cidade-outra" className="sr-only">
                  Escolher cidade
                </label>
                <select
                  id="cidade-outra"
                  value={cidadeOutra}
                  onChange={(e) => setCidadeOutra(e.target.value)}
                  className="w-full min-h-12 rounded-xl bg-[var(--s1)] border border-[var(--line)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] transition"
                >
                  <option value="">Escolha uma cidade</option>
                  {cidades.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Feed de avaliações */}
        <div className="space-y-3 pt-1">
          {carregando ? (
            <p className="text-sm text-[var(--muted)] py-12 text-center">Carregando…</p>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
              <img
                src="/mascot/mascot_peek.png"
                alt=""
                className="w-24 h-24 object-contain opacity-90"
              />
              <h2 className="text-[16px] font-medium text-[var(--ink)]">
                {aba === 'seguindo' ? 'Nada por aqui ainda' : 'Nenhuma ida encontrada'}
              </h2>
              <p className="text-[13px] text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
                {aba === 'seguindo'
                  ? 'Quando você seguir pessoas e elas registrarem idas, elas aparecerão aqui.'
                  : 'Ainda não há idas registradas para este filtro.'}
              </p>
              <button
                type="button"
                onClick={aba === 'seguindo' ? () => setAba('descobrir') : onAbrirAvaliar}
                className="min-h-12 px-6 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-medium text-sm transition shadow-2xs cursor-pointer"
              >
                {aba === 'seguindo' ? 'Descobrir pessoas' : 'Registrar uma ida'}
              </button>
            </div>
          ) : (
            reviews.map((r) => (
              <FeedReviewCard
                key={r.id}
                review={r}
                currentUser={currentUser}
                salvo={!!salvos[r.placeId]}
                seguindo={seguindoIds.has(r.uid)}
                onAbrirLugar={onAbrirLugar}
                onAbrirPerfil={onAbrirPerfil}
                onComentarios={setComentarios}
                onCompartilhar={setCompartilhar}
                onSalvar={handleSalvar}
                onSeguir={handleSeguir}
              />
            ))
          )}
        </div>
      </div>

      {comentarios && (
        <CommentsSheet
          review={comentarios}
          currentUser={currentUser}
          onClose={() => setComentarios(null)}
          onCommentAdded={() =>
            setReviews((rs) =>
              rs.map((x) =>
                x.id === comentarios.id
                  ? { ...x, commentsCount: (x.commentsCount || 0) + 1 }
                  : x
              )
            )
          }
          onCompartilhar={() => {
            setCompartilhar(comentarios);
            setComentarios(null);
          }}
        />
      )}

      {compartilhar && (
        <ShareReviewModal review={compartilhar} onClose={() => setCompartilhar(null)} />
      )}
    </div>
  );
}
