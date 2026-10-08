import React, { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import StarRating from './StarRating';
import PlacePlaceholder from './PlacePlaceholder';
import { alternarCurtida, verificarCurtida } from '../lib/reviews';
import { photoUrl } from '../lib/places';
import type { Review, UserProfile } from '../types';

interface FeedReviewCardProps {
  review: Review;
  currentUser: UserProfile;
  salvo: boolean;
  seguindo: boolean;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onComentarios: (r: Review) => void;
  onCompartilhar: (r: Review) => void;
  onSalvar: (r: Review) => void;
  onSeguir: (uid: string) => void;
}

function tempoRelativo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses}m`;
  return `${Math.floor(meses / 12)}a`;
}

export default function FeedReviewCard({
  review,
  currentUser,
  salvo,
  seguindo,
  onAbrirLugar,
  onAbrirPerfil,
  onComentarios,
  onCompartilhar,
  onSalvar,
  onSeguir,
}: FeedReviewCardProps) {
  const [curtido, setCurtido] = useState(() => verificarCurtida(review.id, currentUser.uid));
  const [curtidas, setCurtidas] = useState(review.likesCount || 0);
  const ehMeu = review.uid === currentUser.uid;

  const foto =
    review.photos?.[0] ||
    review.placePhotoUrl ||
    (review.placePhotoName ? photoUrl(review.placePhotoName, 800) : null);

  const curtir = async () => {
    const antes = curtido;
    const agora = await alternarCurtida(review.id, currentUser.uid);
    setCurtido(agora);
    if (agora !== antes) {
      setCurtidas((c) => Math.max(0, c + (agora ? 1 : -1)));
    }
  };

  return (
    <article className="bg-[var(--s1)] border border-[var(--line)] rounded-2xl overflow-hidden">
      {/* 1. Foto no topo: aspect-[16/9] com nome do lugar no canto inferior esquerdo */}
      <button
        type="button"
        onClick={() => onAbrirLugar(review.placeId)}
        aria-label={`Ver detalhes de ${review.placeName}`}
        className="relative block w-full aspect-[16/9] max-h-40 overflow-hidden cursor-pointer"
      >
        {foto ? (
          <img
            src={foto}
            alt={review.placeName}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <PlacePlaceholder name={review.placeName} className="w-full h-full" />
        )}
        <div className="absolute bottom-2 left-2 max-w-[85%] rounded px-2 py-0.5 bg-black/45 backdrop-blur-[2px]">
          <span className="text-[16px] font-medium text-white truncate block">
            {review.placeName}
          </span>
        </div>
      </button>

      {/* 2. Corpo do Cartão (padding 12px) */}
      <div className="p-3 space-y-2.5">
        {/* Linha do autor */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onAbrirPerfil(review.uid)}
              aria-label={`Ver perfil de ${review.authorName}`}
              className="w-7 h-7 rounded-full overflow-hidden bg-[var(--s2)] text-[var(--primary)] flex items-center justify-center text-xs font-medium shrink-0 cursor-pointer"
            >
              {review.authorPhoto ? (
                <img src={review.authorPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{review.authorName?.charAt(0) || 'U'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onAbrirPerfil(review.uid)}
              className="text-[13px] font-medium text-[var(--ink)] hover:underline truncate cursor-pointer text-left"
            >
              {review.authorName}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!ehMeu && !seguindo && (
              <button
                type="button"
                onClick={() => onSeguir(review.uid)}
                className="h-9 px-3 rounded-lg border border-[var(--line)] text-[13px] font-medium text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition cursor-pointer"
              >
                Seguir
              </button>
            )}
            <span className="text-[12px] text-[var(--muted)]">
              {tempoRelativo(review.visitedAt || review.createdAt || Date.now())}
            </span>
          </div>
        </div>

        {/* Estrelas da nota geral em var(--star) (15px) */}
        <div>
          <StarRating value={review.overall || 0} size={15} />
        </div>

        {/* Texto da review (13px, leading-relaxed, line-clamp-4) */}
        {review.text && (
          <p className="text-[13px] text-[var(--ink)] leading-relaxed line-clamp-4">
            {review.text}
          </p>
        )}

        {/* Prato destaque (se houver) */}
        {review.pratoDestaque && (
          <p className="text-[12px] text-[var(--muted)] truncate">
            Destaque: <span className="text-[var(--ink)] font-medium">{review.pratoDestaque}</span>
          </p>
        )}

        {/* Barra de ações: curtir, comentar, quero ir, compartilhar */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
          {/* Curtir */}
          <button
            type="button"
            onClick={curtir}
            aria-pressed={curtido}
            aria-label={`Curtir. ${curtidas} curtidas`}
            className={`min-h-11 px-2.5 flex items-center gap-1.5 text-[12px] transition cursor-pointer ${
              curtido
                ? 'text-[var(--star)] font-medium'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Heart
              size={17}
              className={curtido ? 'fill-[var(--star)] text-[var(--star)]' : ''}
            />
            <span>{curtidas}</span>
          </button>

          {/* Comentar */}
          <button
            type="button"
            onClick={() => onComentarios(review)}
            aria-label={`Comentar. ${review.commentsCount || 0} comentários`}
            className="min-h-11 px-2.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
          >
            <MessageCircle size={17} />
            <span>{review.commentsCount || 0}</span>
          </button>

          {/* Quero ir */}
          <button
            type="button"
            onClick={() => onSalvar(review)}
            aria-pressed={salvo}
            aria-label={salvo ? 'Salvo em Quero ir' : 'Salvar em Quero ir'}
            className={`min-h-11 px-2.5 flex items-center gap-1.5 text-[12px] transition cursor-pointer ${
              salvo
                ? 'text-[var(--primary)] font-medium'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Bookmark
              size={17}
              className={salvo ? 'fill-[var(--primary)] text-[var(--primary)]' : ''}
            />
            <span>Quero ir</span>
          </button>

          {/* Compartilhar */}
          <button
            type="button"
            onClick={() => onCompartilhar(review)}
            aria-label="Compartilhar avaliação"
            className="min-h-11 px-2.5 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
