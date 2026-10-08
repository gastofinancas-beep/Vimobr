import { useState, useEffect } from 'react';
import {
  Search,
  MoreHorizontal,
  Star,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  FileText,
} from 'lucide-react';
import { carregarExplorar, alternarCurtida } from '../lib/reviews';
import { estaNaWishlist, alternarWishlist } from '../lib/wishlist';
import type { Review, UserProfile, Place } from '../types';
import CommentsSheet from '../components/CommentsSheet';
import ShareReviewModal from '../components/ShareReviewModal';
import PlacePlaceholder from '../components/PlacePlaceholder';

export const SUGGESTED_FRIENDS = [
  {
    uid: 'user-camila',
    name: 'Camila Duarte',
    handle: '@camilagourmet',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    city: 'São Paulo - SP',
    hasNewPost: true,
  },
  {
    uid: 'user-pedro',
    name: 'Pedro Lima',
    handle: '@pedrogastro',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    city: 'São Paulo - SP',
    hasNewPost: true,
  },
  {
    uid: 'user-lucas',
    name: 'Lucas Ferraz',
    handle: '@lucascoffee',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    city: 'São Paulo - SP',
    hasNewPost: false,
  },
  {
    uid: 'user-bia',
    name: 'Beatriz Ramos',
    handle: '@biaprados',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    city: 'São Paulo - SP',
    hasNewPost: false,
  },
];

type ComunidadeTab = 'inicio' | 'amigos' | 'por_perto' | 'eventos';

interface EventoComunidade {
  id: string;
  dataGrupo: string;
  titulo: string;
  horarioLocal: string;
  fotoUrl: string;
  lugarNome: string;
}

const EVENTOS_MOCK: EventoComunidade[] = [
  {
    id: 'ev-1',
    dataGrupo: 'Hoje / sexta-feira',
    titulo: 'Festa Latina & Tapas',
    horarioLocal: '8:00 PM • Taverna Pub & Wine Bar',
    fotoUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
    lugarNome: 'Taverna Pub',
  },
  {
    id: 'ev-2',
    dataGrupo: '17 outubro / sábado',
    titulo: 'Festa de Halloween no Sky',
    horarioLocal: '5:00 PM • SKY - Food | Drinks | Rooftop',
    fotoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    lugarNome: 'SKY Rooftop',
  },
  {
    id: 'ev-3',
    dataGrupo: '24 outubro / sábado',
    titulo: 'Noite de Degustação & Vinhos Artesanais',
    horarioLocal: '7:30 PM • Empório Della Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    lugarNome: 'Empório Della Casa',
  },
  {
    id: 'ev-4',
    dataGrupo: '31 outubro / sexta-feira',
    titulo: 'Circuito de Cafés & Brunch de Outono',
    horarioLocal: '10:00 AM • Alecrim Café & Bistrô',
    fotoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    lugarNome: 'Alecrim Café',
  },
];

export default function ComunidadeScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca,
}: {
  currentUser: UserProfile;
  onAbrirLugar: (place: Place | string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
}) {
  const [tabAtiva, setTabAtiva] = useState<ComunidadeTab>('inicio');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [reviewComentarios, setReviewComentarios] = useState<Review | null>(null);
  const [reviewCompartilhar, setReviewCompartilhar] = useState<Review | null>(null);
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const feed = await carregarExplorar('algoritmo', currentUser.uid);
        setReviews(feed);

        const wMap: Record<string, boolean> = {};
        feed.forEach((r) => {
          if (estaNaWishlist(currentUser.uid, r.placeId)) {
            wMap[r.placeId] = true;
          }
        });
        setWishlistMap(wMap);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [currentUser.uid]);

  const handleCurtir = async (reviewId: string) => {
    const curtiu = await alternarCurtida(reviewId, currentUser.uid);
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          return {
            ...r,
            userLiked: curtiu,
            likesCount: Math.max(0, r.likesCount + (curtiu ? 1 : -1)),
          };
        }
        return r;
      })
    );
  };

  const handleAlternarWishlist = async (review: Review) => {
    const fakePlace: Place = {
      id: review.placeId,
      name: review.placeName,
      address: review.cityName,
      lat: 0,
      lng: 0,
    };
    const res = await alternarWishlist(currentUser.uid, fakePlace);
    setWishlistMap((prev) => ({ ...prev, [review.placeId]: res.added }));
  };

  const tempoFormat = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'agora';
    if (diff < 60) return `${diff}m ago`;
    const hor = Math.floor(diff / 60);
    if (hor < 24) return `${hor}h ago`;
    return `${Math.floor(hor / 24)}d ago`;
  };

  // Filtragem conforme a aba
  const reviewsFiltradas = reviews.filter((r) => {
    if (tabAtiva === 'amigos') {
      return r.uid === 'user-camila' || r.uid === 'user-pedro';
    }
    if (tabAtiva === 'por_perto') {
      return true;
    }
    return true;
  });

  return (
    <div className="flex-1 min-h-screen bg-[var(--bg)] text-[var(--ink)] pb-32 select-none">
      {/* Top Header com Tabs Segementadas */}
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--line)] px-4 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {(
              [
                { key: 'inicio', label: 'Início' },
                { key: 'amigos', label: 'Amigos' },
                { key: 'por_perto', label: 'Por perto' },
                { key: 'eventos', label: 'Eventos' },
              ] as { key: ComunidadeTab; label: string }[]
            ).map((tab) => {
              const isSelected = tabAtiva === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTabAtiva(tab.key)}
                  className="relative pb-2.5 pt-1 text-sm font-bold transition-colors cursor-pointer"
                >
                  <span
                    className={
                      isSelected
                        ? 'text-[var(--ink)] font-bold'
                        : 'text-[var(--muted)] hover:text-[var(--ink)] font-medium'
                    }
                  >
                    {tab.label}
                  </span>
                  {isSelected && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={onAbrirBusca}
            className="w-10 h-10 rounded-xl bg-[var(--s1)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-xl mx-auto px-4 pt-3">
        {/* ABA: EVENTOS */}
        {tabAtiva === 'eventos' && (
          <div className="space-y-6 pt-2 animate-in fade-in duration-200">
            {EVENTOS_MOCK.map((ev) => (
              <div key={ev.id} className="space-y-2">
                <span className="text-xs font-bold text-[var(--ink)]">
                  {ev.dataGrupo}
                </span>

                <div className="rounded-2xl border border-[var(--line)] bg-[var(--s1)] p-3 flex items-center gap-3.5 transition">
                  <img
                    src={ev.fotoUrl}
                    alt={ev.titulo}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-950 dark:text-white truncate">
                      {ev.titulo}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {ev.horarioLocal}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA: AMIGOS VAZIA (Frame 00:15) */}
        {tabAtiva === 'amigos' && reviewsFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-6 animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <FileText size={34} className="text-gray-400 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-gray-950 dark:text-white">
              Nenhuma publicação ainda
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 max-w-xs mt-1 leading-relaxed">
              As publicações vão aparecer aqui conforme as pessoas que você segue compartilham.
            </p>
            <button
              onClick={onAbrirBusca}
              className="mt-5 h-9 px-5 rounded-full bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Encontrar amigos
            </button>
          </div>
        )}

        {/* ABA: INÍCIO E POR PERTO (Feed Letterboxd/Albo - Frames 00:12 - 00:14) */}
        {(tabAtiva === 'inicio' || tabAtiva === 'por_perto' || (tabAtiva === 'amigos' && reviewsFiltradas.length > 0)) && (
          <div className="divide-y divide-gray-100 dark:divide-neutral-800/80">
            {reviewsFiltradas.map((r) => {
              const fotos = r.photos || [];
              const isWishlist = !!wishlistMap[r.placeId];

              return (
                <article key={r.id} className="py-4 space-y-3">
                  {/* Top: Autor + Tempo + Nome do Lugar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={r.authorPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                        alt={r.authorName}
                        onClick={() => onAbrirPerfil(r.uid)}
                        className="w-9 h-9 rounded-full object-cover cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span
                            onClick={() => onAbrirPerfil(r.uid)}
                            className="font-bold text-sm text-gray-950 dark:text-white cursor-pointer hover:underline"
                          >
                            {r.authorName}
                          </span>
                          <span className="text-[11px] text-gray-400">• {tempoFormat(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Avaliou <span className="font-semibold text-gray-800 dark:text-gray-200">{r.placeName}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setReviewCompartilhar(r)}
                      className="text-gray-400 hover:text-gray-700 p-1"
                      aria-label="Opções"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {/* Texto da Avaliação */}
                  {r.text && (
                    <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                      {r.text}
                    </p>
                  )}

                  {/* Estrelas */}
                  <div className="flex items-center gap-1 text-gray-950 dark:text-white">
                    {[1, 2, 3, 4, 5].map((st) => (
                      <Star
                        key={st}
                        size={15}
                        className={
                          st <= Math.round(r.overall)
                            ? 'fill-gray-950 text-gray-950 dark:fill-white dark:text-white'
                            : 'text-gray-300 dark:text-neutral-700'
                        }
                      />
                    ))}
                  </div>

                  {/* Card do Lugar Anexado (estilo poster do Albo) */}
                  <div
                    onClick={() => onAbrirLugar(r.placeId)}
                    className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-gray-50/80 dark:bg-neutral-900/60 p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-100/70 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                        {r.placePhotoUrl ? (
                          <img
                            src={r.placePhotoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PlacePlaceholder name={r.placeName} className="w-full h-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-950 dark:text-white truncate">
                          {r.placeName}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {r.cityName}
                        </p>
                        <span className="text-[12px] text-gray-400">
                          {isWishlist ? 'Salvo na sua biblioteca' : 'Explorar lugar'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAlternarWishlist(r);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-900 transition"
                    >
                      <Bookmark size={18} className={isWishlist ? 'fill-gray-900 text-gray-900 dark:fill-white dark:text-white' : ''} />
                    </button>
                  </div>

                  {/* Fotos adicionais da refeição (se houver) */}
                  {fotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                      {fotos.map((f, i) => (
                        <img
                          key={i}
                          src={f}
                          alt=""
                          className="h-32 w-32 rounded-2xl object-cover border border-gray-100 dark:border-neutral-800 shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  {/* Rodapé de Ações (Curtir, Comentar, Compartilhar) */}
                  <div className="flex items-center justify-between pt-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleCurtir(r.id)}
                        className={`flex items-center gap-1.5 transition ${
                          r.userLiked ? 'text-rose-600 font-bold' : 'hover:text-gray-900'
                        }`}
                      >
                        <Heart
                          size={16}
                          className={r.userLiked ? 'fill-rose-600 text-rose-600' : ''}
                        />
                        <span>{r.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => setReviewComentarios(r)}
                        className="flex items-center gap-1.5 hover:text-gray-900 transition"
                      >
                        <MessageCircle size={16} />
                        <span>{r.commentsCount || 0}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {r.uid === currentUser.uid && (
                        <button
                          onClick={() => setReviewCompartilhar(r)}
                          className="hover:text-gray-900 transition"
                          title="Compartilhar minha avaliação"
                        >
                          <Share2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Sheet de Comentários */}
      {reviewComentarios && (
        <CommentsSheet
          review={reviewComentarios}
          currentUser={currentUser}
          onClose={() => setReviewComentarios(null)}
          onCommentAdded={() => {
            setReviews((prev) =>
              prev.map((r) =>
                r.id === reviewComentarios.id
                  ? { ...r, commentsCount: (r.commentsCount || 0) + 1 }
                  : r
              )
            );
          }}
        />
      )}

      {/* Modal de Compartilhamento */}
      {reviewCompartilhar && (
        <ShareReviewModal
          review={reviewCompartilhar}
          onClose={() => setReviewCompartilhar(null)}
        />
      )}
    </div>
  );
}
