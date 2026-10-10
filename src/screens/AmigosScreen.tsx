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
import MascotMessage from '../components/MascotMessage';
import { Spinner, btn } from '../components/ui';
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

  const handleSeguir = (alvo: string) => {
    setSeguindoIds((s) => new Set(s).add(alvo));
    seguir(currentUser.uid, alvo).catch((err) => console.warn('Falha ao seguir:', err));
  };

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen">
      <div className="max-w-xl mx-auto px-4 pt-4 pb-28">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between pb-3">
          <h1 className="t-title text-ink">Amigos</h1>
          <button type="button" onClick={onAbrirBusca} aria-label="Buscar pessoas" className={btn.icon}>
            <Search size={20} strokeWidth={1.8} />
          </button>
        </header>

        {/* Abas "Quem eu sigo" / "Descobrir" com sublinhado */}
        <div role="tablist" aria-label="Tipo de feed" className="flex gap-6 border-b border-line">
          {(['seguindo', 'descobrir'] as Aba[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`-mb-px border-b-2 pb-2.5 pt-1 text-[15px] transition-colors cursor-pointer ${
                aba === a
                  ? 'border-primary text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {a === 'seguindo' ? 'Quem eu sigo' : 'Descobrir'}
            </button>
          ))}
        </div>

        {/* Filtros (apenas na aba Descobrir) */}
        {aba === 'descobrir' && (
          <div className="space-y-3 pt-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTROS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filtro === f.key}
                  onClick={() => setFiltro(f.key)}
                  className={`h-9 px-3.5 rounded-full text-sm whitespace-nowrap cursor-pointer transition-colors ${
                    filtro === f.key
                      ? 'bg-ink text-bg font-semibold'
                      : 'text-muted ring-1 ring-inset ring-line hover:text-ink'
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
                  className="w-full h-11 rounded-lg bg-s2 px-3.5 text-base text-ink outline-none ring-1 ring-transparent focus:ring-primary transition"
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
        <div className="divide-y divide-line">
          {carregando ? (
            <Spinner label="Carregando avaliações" />
          ) : reviews.length === 0 ? (
            <MascotMessage
              reaction={aba === 'seguindo' ? 'social' : 'explorando'}
              title={aba === 'seguindo' ? 'Siga quem come bem' : 'Nenhuma ida por aqui'}
              subtitle={
                aba === 'seguindo'
                  ? 'As idas das pessoas que você segue aparecem aqui.'
                  : 'Ninguém registrou idas com este filtro ainda.'
              }
              ctaLabel={aba === 'seguindo' ? 'Descobrir pessoas' : 'Registrar uma ida'}
              onCta={aba === 'seguindo' ? () => setAba('descobrir') : onAbrirAvaliar}
            />
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
