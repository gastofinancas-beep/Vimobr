import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, MapPin } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import { carregarExplorar, carregarComunidade, alternarCurtida } from '../lib/reviews';
import type { Review, UserProfile } from '../types';
import MascotMessage from '../components/MascotMessage';
import { Avatar, Logo, btn } from '../components/ui';

type AbaFeed = 'explorar' | 'seguindo';

interface ExplorarScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca?: () => void;
  onAbrirAvaliar?: () => void;
  onMudarTab?: (tab: 'explorar' | 'descobrir' | 'amigos' | 'perfil') => void;
  tema?: 'dark' | 'light';
  onToggleTema?: () => void;
}

export default function ExplorarScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca: _onAbrirBusca,
  onAbrirAvaliar: _onAbrirAvaliar,
  onMudarTab: _onMudarTab,
  tema: _tema,
  onToggleTema: _onToggleTema,
}: ExplorarScreenProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaFeed>('explorar');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const carregouRef = useRef<AbaFeed | null>(null);

  useEffect(() => {
    if (carregouRef.current === abaAtiva) return;
    carregouRef.current = abaAtiva;
    setCarregando(true);

    const carregar =
      abaAtiva === 'explorar'
        ? carregarExplorar('algoritmo', currentUser.uid)
        : carregarComunidade(currentUser.uid);

    carregar
      .then((lista) => setReviews(lista))
      .catch(() => setReviews([]))
      .finally(() => setCarregando(false));
  }, [abaAtiva, currentUser.uid]);

  const handleCurtir = async (reviewId: string) => {
    const curtida = await alternarCurtida(reviewId, currentUser.uid);
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, userLiked: curtida, likesCount: r.likesCount + (curtida ? 1 : -1) }
          : r
      )
    );
  };

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 pt-4 pb-3">
          <Logo altura={24} />
          <NotificationBell
            currentUserUid={currentUser.uid}
            onClick={() => setMostrarNotificacoes(true)}
            className={btn.icon}
          />
        </div>

        {/* Abas */}
        <div className="max-w-2xl mx-auto flex border-b border-line">
          {(['explorar', 'seguindo'] as AbaFeed[]).map((aba) => (
            <button
              key={aba}
              type="button"
              onClick={() => {
                if (aba === abaAtiva) return;
                carregouRef.current = null;
                setReviews([]);
                setAbaAtiva(aba);
              }}
              className={`flex-1 py-2.5 text-[14px] font-semibold transition-colors cursor-pointer ${
                abaAtiva === aba
                  ? 'text-ink border-b-2 border-ink -mb-px'
                  : 'text-muted hover:text-ink-2'
              }`}
            >
              {aba === 'explorar' ? 'Explorar' : 'Seguindo'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {carregando ? (
          <Skeleton />
        ) : reviews.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={
              abaAtiva === 'seguindo'
                ? 'Nenhuma avaliação de quem você segue'
                : 'Nenhuma avaliação por aqui ainda'
            }
            subtitle={
              abaAtiva === 'seguindo'
                ? 'Siga pessoas para ver as avaliações delas aqui.'
                : 'Seja o primeiro a avaliar um lugar.'
            }
          />
        ) : (
          <div>
            {reviews.map((review, idx) => (
              <React.Fragment key={review.id}>
                <PostCard
                  review={review}
                  currentUserUid={currentUser.uid}
                  onCurtir={handleCurtir}
                  onAbrirLugar={onAbrirLugar}
                  onAbrirPerfil={onAbrirPerfil}
                />
                {/* Seção "Pessoas para seguir" a cada 4 posts */}
                {(idx + 1) % 4 === 0 && idx < reviews.length - 1 && (
                  <PessoasParaSeguir
                    reviews={reviews}
                    meuUid={currentUser.uid}
                    onAbrirPerfil={onAbrirPerfil}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </main>

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(id) => onAbrirLugar(id)}
          onAbrirPerfil={onAbrirPerfil}
        />
      )}
    </div>
  );
}

/** Post individual do feed social */
function PostCard({
  review,
  currentUserUid,
  onCurtir,
  onAbrirLugar,
  onAbrirPerfil,
}: {
  review: Review;
  currentUserUid: string;
  onCurtir: (id: string) => void;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
}) {
  const [slideAtual, setSlideAtual] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Todas as fotos do post: pessoas primeiro, depois do lugar
  const fotos: string[] = [
    ...(review.peoplePhotos ?? []),
    ...(review.photos ?? []),
  ];

  // Se não há fotos próprias, usa a foto do lugar como fallback
  const fotoFallback = review.placePhotoUrl ?? null;

  const temFotos = fotos.length > 0;
  const fotosExibidas = temFotos ? fotos : fotoFallback ? [fotoFallback] : [];

  const onScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setSlideAtual(idx);
  };

  const agora = Date.now();
  const diffMin = Math.floor((agora - review.createdAt) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const tempo =
    diffMin < 1
      ? 'agora'
      : diffMin < 60
      ? `${diffMin}min`
      : diffH < 24
      ? `${diffH}h`
      : diffD < 7
      ? `${diffD}d`
      : new Date(review.createdAt).toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
        });

  return (
    <article className="border-b border-line py-4">
      {/* Cabeçalho: avatar + nome + local + tempo */}
      <div className="flex items-center gap-3 px-4 mb-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(review.uid)}
          aria-label={`Ver perfil de ${review.authorName}`}
          className="shrink-0 cursor-pointer"
        >
          <Avatar src={review.authorPhoto} name={review.authorName} size={40} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onAbrirPerfil(review.uid)}
              className="font-semibold text-[14px] text-ink hover:underline cursor-pointer text-left"
            >
              {review.authorName}
            </button>
            <span className="text-[12px] text-muted">{tempo}</span>
          </div>
          <button
            type="button"
            onClick={() => onAbrirLugar(review.placeId)}
            className="flex items-center gap-1 mt-0.5 cursor-pointer group"
          >
            <MapPin size={11} strokeWidth={2} className="text-primary shrink-0" />
            <span className="text-[12px] text-ink-2 group-hover:text-primary transition-colors truncate">
              {review.placeName}
              {review.cityName ? ` · ${review.cityName}` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Fotos em carrossel */}
      {fotosExibidas.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {fotosExibidas.map((url, i) => (
              <div key={i} className="shrink-0 w-full snap-start aspect-[4/3] bg-s2">
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Indicadores */}
          {fotosExibidas.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {fotosExibidas.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === slideAtual ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ações: curtir e comentar */}
      <div className="flex items-center gap-4 px-4 mt-3">
        <button
          type="button"
          onClick={() => onCurtir(review.id)}
          aria-label={review.userLiked ? 'Descurtir' : 'Curtir'}
          className={`flex items-center gap-1.5 text-[14px] transition-colors cursor-pointer ${
            review.userLiked ? 'text-red-500' : 'text-muted hover:text-ink'
          }`}
        >
          <Heart
            size={22}
            strokeWidth={1.8}
            className={review.userLiked ? 'fill-current' : ''}
          />
          {review.likesCount > 0 && (
            <span className="font-medium text-[13px]">{review.likesCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onAbrirLugar(review.placeId)}
          aria-label="Comentar"
          className="flex items-center gap-1.5 text-[14px] text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <MessageCircle size={22} strokeWidth={1.8} />
          {review.commentsCount > 0 && (
            <span className="font-medium text-[13px]">{review.commentsCount}</span>
          )}
        </button>
      </div>

      {/* Texto da avaliação */}
      {review.text ? (
        <p className="px-4 mt-2 text-[14px] text-ink leading-relaxed">
          <span className="font-semibold">{review.authorName.split(' ')[0]}</span>{' '}
          <TruncatedText texto={review.text} />
        </p>
      ) : null}
    </article>
  );
}

/** Texto com "ver mais" quando ultrapassa 3 linhas */
function TruncatedText({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false);
  const curto = texto.length <= 120;

  if (curto || expandido) return <span>{texto}</span>;

  return (
    <>
      <span>{texto.slice(0, 120).trimEnd()}… </span>
      <button
        type="button"
        onClick={() => setExpandido(true)}
        className="text-muted font-medium cursor-pointer hover:text-ink"
      >
        ver mais
      </button>
    </>
  );
}

/** Seção horizontal de sugestões de pessoas para seguir */
function PessoasParaSeguir({
  reviews,
  meuUid,
  onAbrirPerfil,
}: {
  reviews: Review[];
  meuUid: string;
  onAbrirPerfil: (uid: string) => void;
}) {
  const visto = new Set<string>();
  const autores: { uid: string; nome: string; foto: string }[] = [];
  for (const r of reviews) {
    if (r.uid !== meuUid && !visto.has(r.uid)) {
      visto.add(r.uid);
      autores.push({ uid: r.uid, nome: r.authorName, foto: r.authorPhoto });
    }
    if (autores.length >= 8) break;
  }
  if (autores.length === 0) return null;

  return (
    <div className="py-4 bg-s1 border-b border-line">
      <p className="px-4 mb-3 text-[13px] font-semibold text-ink">Pessoas para seguir</p>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
        {autores.map((a) => (
          <button
            key={a.uid}
            type="button"
            onClick={() => onAbrirPerfil(a.uid)}
            className="shrink-0 flex flex-col items-center gap-2 w-16 cursor-pointer group"
          >
            <Avatar src={a.foto} name={a.nome} size={52} />
            <p className="text-center text-[11px] font-medium text-ink leading-tight line-clamp-2 group-hover:text-primary transition-colors w-full">
              {a.nome.split(' ')[0]}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-line">
      {[1, 2, 3].map((i) => (
        <div key={i} className="py-4 animate-pulse space-y-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-s2 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-s2" />
              <div className="h-3 w-20 rounded bg-s2" />
            </div>
          </div>
          <div className="aspect-[4/3] w-full rounded bg-s2" />
          <div className="flex gap-4">
            <div className="h-5 w-12 rounded bg-s2" />
            <div className="h-5 w-12 rounded bg-s2" />
          </div>
          <div className="h-3.5 w-4/5 rounded bg-s2" />
        </div>
      ))}
    </div>
  );
}
