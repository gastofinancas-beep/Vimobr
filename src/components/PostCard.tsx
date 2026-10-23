import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, MapPin, Lock, Users, Shield, Star, MoreHorizontal, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import AvaliacaoSheet from './AvaliacaoSheet';
import { mostrarAviso } from './Aviso';
import { MenuModeracao } from './Moderacao';
import ComentariosModal from './ComentariosModal';
import { alterarArquivamento, apagarPost, curtirPost } from '../lib/posts';
import { buscarAvaliacaoDoPost } from '../lib/reviews';
import { clubeFoiExcluido } from '../lib/clubes';
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

  const handleApagar = (post: FoodTweet) => {
    apagarPost(post);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    mostrarAviso('Post apagado');
  };

  // Denunciado some só ele; bloqueado leva junto tudo da pessoa
  const handleModerado = (post: FoodTweet, acao: 'denunciado' | 'bloqueado') =>
    setPosts((prev) => prev.filter((p) => (acao === 'bloqueado' ? p.uid !== post.uid : p.id !== post.id)));

  const handleArquivar = (post: FoodTweet, arquivar: boolean) => {
    const novo = alterarArquivamento(post, arquivar);
    setPosts((prev) =>
      arquivar && !mostrarVisibilidade
        ? prev.filter((p) => p.id !== post.id)
        : prev.map((p) => (p.id === post.id ? { ...p, ...novo } : p))
    );
    mostrarAviso(arquivar ? 'Post arquivado. Só você vê no seu perfil.' : 'Post visível para todos de novo');
  };

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
            ehMeu={post.uid === currentUser.uid}
            onApagar={() => handleApagar(post)}
            onArquivar={(arquivar) => handleArquivar(post, arquivar)}
            meuUid={currentUser.uid}
            onModerado={(acao) => handleModerado(post, acao)}
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
  ehMeu = false,
  onApagar,
  onArquivar,
  meuUid,
  onModerado,
}: {
  post: FoodTweet;
  onCurtir: (id: string) => void;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onComentar: () => void;
  mostrarVisibilidade?: boolean;
  ehMeu?: boolean;
  onApagar?: () => void;
  onArquivar?: (arquivar: boolean) => void;
  meuUid?: string;
  onModerado?: (acao: 'denunciado' | 'bloqueado') => void;
}) {
  const [curtidoAnimando, setCurtidoAnimando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
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
      : null;
  const clubeTag =
    v !== 'clube'
      ? null
      : post.clubeId && clubeFoiExcluido(post.clubeId)
      ? `${post.clubeNome ?? 'Clube'} · clube excluído, só você vê`
      : post.clubeNome ?? 'Clube';

  const fotos = post.photoUrls ?? (post.photoUrl ? [post.photoUrl] : []);

  return (
    <article className="border-b border-line px-4 py-4">
      {clubeTag && (
        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
          <Shield size={14} strokeWidth={2} className="shrink-0 text-primary" />
          <span className="truncate">{clubeTag}</span>
        </p>
      )}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(post.uid)}
          aria-label={`Ver perfil de ${post.authorName}`}
          className="shrink-0 cursor-pointer"
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
        </div>

        {(ehMeu || meuUid !== undefined) && (
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Opções do post"
            className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-s2 transition-colors cursor-pointer"
          >
            <MoreHorizontal size={20} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {post.text && (
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink whitespace-pre-line break-words">
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

      {vendoAvaliacao && avaliacao && (
        <AvaliacaoSheet review={avaliacao} onFechar={() => setVendoAvaliacao(false)} onAbrirLugar={onAbrirLugar} />
      )}

      {menuAberto && !ehMeu && meuUid !== undefined && (
        <MenuModeracao
          alvo={{ tipo: 'post', id: post.id, uid: post.uid, nome: post.authorName || 'Usuário', foto: post.authorPhoto }}
          meuUid={meuUid}
          onFechar={() => setMenuAberto(false)}
          onFeito={onModerado}
        />
      )}

      {menuAberto && ehMeu && (
        <MenuPost
          arquivado={v === 'privado'}
          onFechar={() => setMenuAberto(false)}
          onArquivar={(arquivar) => {
            setMenuAberto(false);
            onArquivar?.(arquivar);
          }}
          onApagar={() => {
            setMenuAberto(false);
            onApagar?.();
          }}
        />
      )}
    </article>
  );
}

function MenuPost({
  arquivado,
  onFechar,
  onArquivar,
  onApagar,
}: {
  arquivado: boolean;
  onFechar: () => void;
  onArquivar: (arquivar: boolean) => void;
  onApagar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const item = 'flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-s2 transition-colors cursor-pointer';

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Opções do post" className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-2xl rounded-t-2xl bg-bg pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        {confirmando ? (
          <div className="px-5 pt-2 pb-6">
            <h2 className="font-display text-[18px] font-bold text-ink">Apagar este post?</h2>
            <p className="mt-1 text-[14px] text-muted">As fotos, curtidas e comentários somem. Não dá para desfazer.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmando(false)} className="h-11 rounded-full bg-s2 text-[14px] font-semibold text-ink cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={onApagar} className="h-11 rounded-full bg-danger text-[14px] font-semibold text-white cursor-pointer">
                Apagar
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line pb-4">
            <button type="button" onClick={() => onArquivar(!arquivado)} className={item}>
              {arquivado ? <ArchiveRestore size={20} strokeWidth={1.8} className="text-ink" /> : <Archive size={20} strokeWidth={1.8} className="text-ink" />}
              <span>
                <span className="block text-[15px] font-semibold text-ink">{arquivado ? 'Desarquivar' : 'Arquivar'}</span>
                <span className="block text-[12px] text-muted">
                  {arquivado ? 'Volta a aparecer para todos' : 'Some do feed e fica visível só para você'}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => setConfirmando(true)} className={item}>
              <Trash2 size={20} strokeWidth={1.8} className="text-danger" />
              <span className="text-[15px] font-semibold text-danger">Apagar post</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Uma foto por vez; arrasta para o lado e as bolinhas mostram a posição. */
function CarrosselFotos({ fotos, onDoubleClick }: { fotos: string[]; onDoubleClick: () => void }) {
  const [atual, setAtual] = useState(0);
  const trilhoRef = useRef<HTMLDivElement>(null);
  const varios = fotos.length > 1;

  const aoRolar = () => {
    const el = trilhoRef.current;
    if (!el || !el.clientWidth) return;
    setAtual(Math.round(el.scrollLeft / el.clientWidth));
  };

  const irPara = (i: number) => {
    const el = trilhoRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl bg-s2" onDoubleClick={onDoubleClick}>
      <div
        ref={trilhoRef}
        onScroll={varios ? aoRolar : undefined}
        className="no-scrollbar flex aspect-square max-h-[480px] w-full snap-x snap-mandatory overflow-x-auto"
      >
        {fotos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={varios ? `Foto ${i + 1} de ${fotos.length}` : ''}
            loading="lazy"
            draggable={false}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {varios && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5">
          {fotos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === atual}
              className={`h-1.5 w-1.5 rounded-full transition-colors cursor-pointer ${i === atual ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      )}
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
        <div key={i} className="px-4 py-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-[42px] w-[42px] shrink-0 rounded-full bg-s2" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-s2" />
              <div className="h-3 w-24 rounded bg-s2" />
            </div>
          </div>
          <div className="h-3.5 w-4/5 rounded bg-s2" />
          <div className="aspect-square w-full rounded-2xl bg-s2" />
        </div>
      ))}
    </div>
  );
}
