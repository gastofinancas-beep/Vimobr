import React, { useState } from 'react';
import { Heart, MessageCircle, MapPin, MoreHorizontal, Bookmark, Lock, Users, Shield } from 'lucide-react';
import ComentariosModal from './ComentariosModal';
import { curtirPost } from '../lib/posts';
import type { FoodTweet, UserProfile } from '../types';
import { Avatar } from './ui';

function tempoRelativo(createdAt: number): string {
  const diffMin = Math.floor((Date.now() - createdAt) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return new Date(createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
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
  const [salvo, setSalvo] = useState(false);

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
    <article className="border-b border-line">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(post.uid)}
          aria-label={`Ver perfil de ${post.authorName}`}
          className="shrink-0 cursor-pointer"
        >
          <Avatar src={post.authorPhoto} name={post.authorName} size={40} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <button
              type="button"
              onClick={() => onAbrirPerfil(post.uid)}
              className="font-semibold text-[14px] text-ink hover:underline cursor-pointer truncate"
            >
              {post.authorName}
            </button>
            <span className="text-[13px] text-muted shrink-0">{tempoRelativo(post.createdAt)}</span>
          </div>
          {selo && (
            <span className="flex items-center gap-1 mt-0.5 text-[12px] text-muted">
              <selo.Icon size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{selo.texto}</span>
            </span>
          )}
          {post.placeName && (
            <button
              type="button"
              onClick={() => post.placeId && onAbrirLugar(post.placeId)}
              className="flex items-center gap-1 mt-0.5 cursor-pointer group"
            >
              <MapPin size={11} strokeWidth={2} className="text-primary shrink-0" />
              <span className="text-[12px] text-muted group-hover:text-primary transition-colors truncate">
                {post.placeName}{post.cityName ? ` · ${post.cityName}` : ''}
              </span>
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Mais opções"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted"
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
        </button>
      </div>

      {fotos.length > 0 && <GridFotos fotos={fotos} onDoubleClick={handleCurtir} />}

      <div className="flex items-center px-3 pt-2 pb-1">
        <button
          type="button"
          onClick={handleCurtir}
          aria-label={post.userLiked ? 'Descurtir' : 'Curtir'}
          className={`flex items-center gap-1.5 px-1.5 py-2 cursor-pointer ${post.userLiked ? 'text-red-500' : 'text-ink'}`}
        >
          <Heart
            size={24}
            strokeWidth={1.6}
            className={`transition-transform duration-150 ${curtidoAnimando ? 'scale-125' : 'scale-100'} ${post.userLiked ? 'fill-current' : ''}`}
          />
          {post.likesCount > 0 && <span className="font-medium text-[14px]">{post.likesCount}</span>}
        </button>
        <button
          type="button"
          onClick={onComentar}
          aria-label="Comentar"
          className="flex items-center gap-1.5 px-1.5 py-2 ml-3 text-ink cursor-pointer"
        >
          <MessageCircle size={24} strokeWidth={1.6} />
          {post.commentsCount > 0 && <span className="font-medium text-[14px]">{post.commentsCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setSalvo((s) => !s)}
          aria-label={salvo ? 'Remover dos salvos' : 'Salvar'}
          className="ml-auto px-1.5 py-2 text-ink cursor-pointer"
        >
          <Bookmark size={24} strokeWidth={1.6} className={salvo ? 'fill-current' : ''} />
        </button>
      </div>

      {post.text ? (
        <p className="px-4 pb-4 text-[14px] text-ink leading-relaxed">
          <button
            type="button"
            onClick={() => onAbrirPerfil(post.uid)}
            className="font-semibold hover:underline cursor-pointer mr-1"
          >
            {post.authorName.split(' ')[0]}
          </button>
          <TextoTruncado texto={post.text} />
        </p>
      ) : (
        <div className="pb-3" />
      )}
    </article>
  );
}

function GridFotos({ fotos, onDoubleClick }: { fotos: string[]; onDoubleClick: () => void }) {
  const n = fotos.length;
  const img = (src: string) => <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />;

  if (n === 1) {
    return (
      <div className="w-full aspect-[4/3] overflow-hidden" onDoubleClick={onDoubleClick}>
        {img(fotos[0])}
      </div>
    );
  }

  if (n === 2) {
    return (
      <div className="w-full flex gap-0.5 aspect-[4/3]" onDoubleClick={onDoubleClick}>
        {fotos.map((src, i) => (
          <div key={i} className="flex-1 overflow-hidden">{img(src)}</div>
        ))}
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className="w-full flex gap-0.5 aspect-[4/3]" onDoubleClick={onDoubleClick}>
        <div className="flex-1 overflow-hidden">{img(fotos[0])}</div>
        <div className="flex-1 flex flex-col gap-0.5">
          {fotos.slice(1).map((src, i) => (
            <div key={i} className="flex-1 overflow-hidden">{img(src)}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-2 gap-0.5" onDoubleClick={onDoubleClick}>
      {fotos.slice(0, 4).map((src, i) => (
        <div key={i} className="aspect-square overflow-hidden">{img(src)}</div>
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
        <div key={i} className="py-4 animate-pulse space-y-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-s2 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-s2" />
              <div className="h-3 w-20 rounded bg-s2" />
            </div>
          </div>
          <div className="aspect-square w-full rounded bg-s2" />
          <div className="h-3.5 w-4/5 rounded bg-s2" />
        </div>
      ))}
    </div>
  );
}
