import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, MapPin, Lock, Users, Shield, Star } from 'lucide-react';
import AvaliacaoSheet from './AvaliacaoSheet';
import ComentariosModal from './ComentariosModal';
import { curtirPost } from '../lib/posts';
import { buscarAvaliacaoDoPost } from '../lib/reviews';
import type { FoodTweet, Review, UserProfile } from '../types';
import { Avatar } from './ui';

function tempoRelativo(createdAt: number): string {
  const diffMin = Math.floor((Date.now() - createdAt) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffH < 24) return `${diffH} h atrás`;
  if (diffD === 1) return 'ontem';
  if (diffD < 7) return `${diffD} dias atrás`;
  return new Date(createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Lista de posts com curtidas e comentários já ligados. */
export function FeedPosts({
  posts,
  setPosts,
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  mostrarVisibilidade = false,
}: {
  posts: FoodTweet[];
  setPosts: React.Dispatch<React.SetStateAction<FoodTweet[]>>;
  currentUser: UserProfile;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
  mostrarVisibilidade?: boolean;
}) {
  const [postComentando, setPostComentando] = useState<string | null>(null);

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

  return (
    <>
      <div>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onCurtir={handleCurtir}
            onAbrirLugar={onAbrirLugar}
            onAbrirPerfil={onAbrirPerfil}
            onComentar={() => setPostComentando(post.id)}
            mostrarVisibilidade={mostrarVisibilidade}
          />
        ))}
      </div>
      {postComentando && (
        <ComentariosModal
          postId={postComentando}
          currentUser={currentUser}
          onClose={() => setPostComentando(null)}
          onNovoComentario={() =>
            setPosts((prev) =>
              prev.map((p) => (p.id === postComentando ? { ...p, commentsCount: p.commentsCount + 1 } : p))
            )
          }
        />
      )}
    </>
  );
}

export function PostCard({
  post,
  onCurtir,
  onAbrirLugar,
  onAbrirPerfil,
  onComentar,
  mostrarVisibilidade = false,
}: {
  post: FoodTweet;
  onCurtir: (id: string) => void;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onComentar: () => void;
  mostrarVisibilidade?: boolean;
}) {
  const [curtidoAnimando, setCurtidoAnimando] = useState(false);
  const [avaliacao, setAvaliacao] = useState<Review | null>(null);
  const [vendoAvaliacao, setVendoAvaliacao] = useState(false);

  useEffect(() => {
    if (!post.placeId) return;
    let ativo = true;
    buscarAvaliacaoDoPost(post.uid, post.placeId).then((r) => ativo && setAvaliacao(r));
    return () => {
      ativo = false;
    };
  }, [post.uid, post.placeId]);

  const handleCurtir = () => {
    setCurtidoAnimando(true);
    setTimeout(() => setCurtidoAnimando(false), 300);
    onCurtir(post.id);
  };

  const v = post.visibilidade ?? 'publico';
  const selo =
    !mostrarVisibilidade || v === 'publico'
      ? null
      : v === 'privado'
      ? { Icon: Lock, texto: 'Só eu' }
      : v === 'amigos'
      ? { Icon: Users, texto: 'Melhores amigos' }
      : { Icon: Shield, texto: post.clubeNome ?? 'Clube' };

  const fotos = post.photoUrls ?? (post.photoUrl ? [post.photoUrl] : []);

  return (
    <article className="flex gap-3 border-b border-line px-4 py-4">
      <button
        type="button"
        onClick={() => onAbrirPerfil(post.uid)}
        aria-label={`Ver perfil de ${post.authorName}`}
        className="shrink-0 self-start cursor-pointer"
      >
        <Avatar src={post.authorPhoto} name={post.authorName} size={42} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => onAbrirPerfil(post.uid)}
            className="truncate text-[15px] font-semibold text-ink hover:underline cursor-pointer"
          >
            {post.authorName}
          </button>
          <span className="shrink-0 text-[13px] text-muted">· {tempoRelativo(post.createdAt)}</span>
        </div>

        {post.placeName && (
          <button
            type="button"
            disabled={!post.placeId}
            onClick={() => post.placeId && onAbrirLugar(post.placeId)}
            className="group mt-0.5 flex max-w-full items-center gap-1 text-left enabled:cursor-pointer"
          >
            <MapPin size={13} strokeWidth={2} className="shrink-0 text-primary" />
            <span className="truncate text-[13px] font-medium text-ink-2 group-enabled:group-hover:text-primary transition-colors">
              {post.placeName}
              {post.cityName ? ` · ${post.cityName}` : ''}
            </span>
          </button>
        )}

        {selo && (
          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <selo.Icon size={11} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{selo.texto}</span>
          </span>
        )}

        {post.text && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink whitespace-pre-line break-words">
            <TextoTruncado texto={post.text} />
          </p>
        )}

        {fotos.length > 0 && <CarrosselFotos fotos={fotos} onDoubleClick={handleCurtir} />}

        <div className="mt-2 -ml-1.5 flex items-center">
          <button
            type="button"
            onClick={handleCurtir}
            aria-label={post.userLiked ? 'Descurtir' : 'Curtir'}
            className={`flex items-center gap-1.5 px-1.5 py-2 cursor-pointer ${post.userLiked ? 'text-red-500' : 'text-ink'}`}
          >
            <Heart
              size={22}
              strokeWidth={1.7}
              className={`transition-transform duration-150 ${curtidoAnimando ? 'scale-125' : 'scale-100'} ${post.userLiked ? 'fill-current' : ''}`}
            />
            <span className="text-[14px] font-medium tabular">{post.likesCount}</span>
          </button>
          <button
            type="button"
            onClick={onComentar}
            aria-label="Comentar"
            className="ml-2 flex items-center gap-1.5 px-1.5 py-2 text-ink cursor-pointer"
          >
            <MessageCircle size={22} strokeWidth={1.7} />
            <span className="text-[14px] font-medium tabular">{post.commentsCount}</span>
          </button>
          {avaliacao && (
            <button
              type="button"
              onClick={() => setVendoAvaliacao(true)}
              className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-white active:scale-[0.97] transition-transform cursor-pointer"
            >
              <Star size={14} strokeWidth={2.2} className="fill-current" />
              Veja a avaliação
            </button>
          )}
        </div>
      </div>

      {vendoAvaliacao && avaliacao && (
        <AvaliacaoSheet review={avaliacao} onFechar={() => setVendoAvaliacao(false)} onAbrirLugar={onAbrirLugar} />
      )}
    </article>
  );
}

/** Fotos em fileira horizontal com cantos arredondados; a próxima aparece pela metade. */
function CarrosselFotos({ fotos, onDoubleClick }: { fotos: string[]; onDoubleClick: () => void }) {
  if (fotos.length === 1) {
    return (
      <div className="mt-3 aspect-[4/5] max-h-[460px] w-full overflow-hidden rounded-2xl bg-s2" onDoubleClick={onDoubleClick}>
        <img src={fotos[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="no-scrollbar -mr-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pr-4 scroll-pr-4"
      onDoubleClick={onDoubleClick}
    >
      {fotos.map((src, i) => (
        <div key={i} className="aspect-[4/5] w-[74%] shrink-0 snap-start overflow-hidden rounded-2xl bg-s2">
          <img src={src} alt={`Foto ${i + 1} de ${fotos.length}`} loading="lazy" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function TextoTruncado({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false);
  if (texto.length <= 120 || expandido) return <span>{texto}</span>;
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

export function SkeletonPosts() {
  return (
    <div className="divide-y divide-line">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-4 animate-pulse">
          <div className="h-[42px] w-[42px] shrink-0 rounded-full bg-s2" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-36 rounded bg-s2" />
            <div className="h-3 w-24 rounded bg-s2" />
            <div className="h-3.5 w-4/5 rounded bg-s2" />
            <div className="flex gap-2 overflow-hidden pt-1">
              <div className="aspect-[4/5] w-[74%] shrink-0 rounded-2xl bg-s2" />
              <div className="aspect-[4/5] w-[74%] shrink-0 rounded-2xl bg-s2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
