import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, MapPin, PenSquare } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import CriarPostModal from '../components/CriarPostModal';
import ComentariosModal from '../components/ComentariosModal';
import { carregarPosts, curtirPost } from '../lib/posts';
import type { FoodTweet, UserProfile } from '../types';
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
}: ExplorarScreenProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaFeed>('explorar');
  const [posts, setPosts] = useState<FoodTweet[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarCriarPost, setMostrarCriarPost] = useState(false);
  const [postComentando, setPostComentando] = useState<string | null>(null);
  const carregouRef = useRef<AbaFeed | null>(null);

  const carregar = (aba: AbaFeed) => {
    setCarregando(true);
    carregarPosts(currentUser.uid, 30)
      .then((lista) => {
        if (aba === 'seguindo') {
          setPosts(lista.filter((p) => p.isMutual));
        } else {
          setPosts(lista);
        }
      })
      .catch(() => setPosts([]))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (carregouRef.current === abaAtiva) return;
    carregouRef.current = abaAtiva;
    carregar(abaAtiva);
  }, [abaAtiva, currentUser.uid]);

  const handleCurtir = async (postId: string) => {
    const curtiu = await curtirPost(postId, currentUser.uid);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, userLiked: curtiu, likesCount: Math.max(0, p.likesCount + (curtiu ? 1 : -1)) }
          : p
      )
    );
  };

  const handleNovoPost = () => {
    setMostrarCriarPost(false);
    carregouRef.current = null;
    carregar(abaAtiva);
  };

  const handleNovoComentario = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
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
                setPosts([]);
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
        ) : posts.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={
              abaAtiva === 'seguindo'
                ? 'Nenhuma publicação de quem você segue'
                : 'Nenhuma publicação por aqui ainda'
            }
            subtitle={
              abaAtiva === 'seguindo'
                ? 'Siga pessoas para ver as publicações delas aqui.'
                : 'Seja o primeiro a publicar algo.'
            }
          />
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserUid={currentUser.uid}
                onCurtir={handleCurtir}
                onAbrirLugar={onAbrirLugar}
                onAbrirPerfil={onAbrirPerfil}
                onComentar={() => setPostComentando(post.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB — criar post */}
      <button
        type="button"
        onClick={() => setMostrarCriarPost(true)}
        aria-label="Nova publicação"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        <PenSquare size={22} strokeWidth={2} className="text-white" />
      </button>

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(id) => onAbrirLugar(id)}
          onAbrirPerfil={onAbrirPerfil}
        />
      )}

      {mostrarCriarPost && (
        <CriarPostModal
          currentUser={currentUser}
          onClose={() => setMostrarCriarPost(false)}
          onPublicado={handleNovoPost}
        />
      )}

      {postComentando && (
        <ComentariosModal
          postId={postComentando}
          currentUser={currentUser}
          onClose={() => setPostComentando(null)}
          onNovoComentario={() => handleNovoComentario(postComentando)}
        />
      )}
    </div>
  );
}

/** Post individual do feed social */
function PostCard({
  post,
  onCurtir,
  onAbrirLugar,
  onAbrirPerfil,
  onComentar,
}: {
  post: FoodTweet;
  currentUserUid: string;
  onCurtir: (id: string) => void;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onComentar: () => void;
}) {
  const agora = Date.now();
  const diffMin = Math.floor((agora - post.createdAt) / 60000);
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
      : new Date(post.createdAt).toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
        });

  return (
    <article className="border-b border-line py-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 mb-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(post.uid)}
          aria-label={`Ver perfil de ${post.authorName}`}
          className="shrink-0 cursor-pointer"
        >
          <Avatar src={post.authorPhoto} name={post.authorName} size={40} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onAbrirPerfil(post.uid)}
              className="font-semibold text-[14px] text-ink hover:underline cursor-pointer text-left"
            >
              {post.authorName}
            </button>
            <span className="text-[12px] text-muted">{tempo}</span>
          </div>
          {post.placeName && (
            <button
              type="button"
              onClick={() => post.placeId && onAbrirLugar(post.placeId)}
              className="flex items-center gap-1 mt-0.5 cursor-pointer group"
            >
              <MapPin size={11} strokeWidth={2} className="text-primary shrink-0" />
              <span className="text-[12px] text-ink-2 group-hover:text-primary transition-colors truncate">
                {post.placeName}
                {post.cityName ? ` · ${post.cityName}` : ''}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Foto */}
      {post.photoUrl && (
        <div className="w-full aspect-square bg-s2">
          <img
            src={post.photoUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-4 px-4 mt-3">
        <button
          type="button"
          onClick={() => onCurtir(post.id)}
          aria-label={post.userLiked ? 'Descurtir' : 'Curtir'}
          className={`flex items-center gap-1.5 text-[14px] transition-colors cursor-pointer ${
            post.userLiked ? 'text-red-500' : 'text-muted hover:text-ink'
          }`}
        >
          <Heart
            size={22}
            strokeWidth={1.8}
            className={post.userLiked ? 'fill-current' : ''}
          />
          {post.likesCount > 0 && (
            <span className="font-medium text-[13px]">{post.likesCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={onComentar}
          aria-label="Comentar"
          className="flex items-center gap-1.5 text-[14px] text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <MessageCircle size={22} strokeWidth={1.8} />
          {post.commentsCount > 0 && (
            <span className="font-medium text-[13px]">{post.commentsCount}</span>
          )}
        </button>
      </div>

      {/* Texto */}
      {post.text ? (
        <p className="px-4 mt-2 text-[14px] text-ink leading-relaxed">
          <span className="font-semibold">{post.authorName.split(' ')[0]}</span>{' '}
          <TruncatedText texto={post.text} />
        </p>
      ) : null}
    </article>
  );
}

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
          <div className="aspect-square w-full rounded bg-s2" />
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
