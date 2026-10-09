import React, { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import StarRating from './StarRating';
import { Avatar, PlaceImage } from './ui';
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
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return dias === 1 ? 'ontem' : `${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? '1 mês' : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

const acao =
  'min-h-11 -mx-1 px-1 flex items-center gap-1.5 text-sm tabular transition-colors cursor-pointer';

/**
 * Entrada do feed: quem avaliou → foto do lugar → lugar e nota → texto → ações.
 * Sem moldura de card: as entradas são separadas por uma linha fina na lista.
 */
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
    <article className="py-5">
      {/* Quem avaliou */}
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(review.uid)}
          className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer"
        >
          <Avatar src={review.authorPhoto} name={review.authorName} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{review.authorName}</span>
            <span className="block t-meta">
              {tempoRelativo(review.visitedAt || review.createdAt || Date.now())}
            </span>
          </span>
        </button>

        {!ehMeu && !seguindo && (
          <button
            type="button"
            onClick={() => onSeguir(review.uid)}
            className="h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold text-primary ring-1 ring-inset ring-line hover:ring-primary transition cursor-pointer"
          >
            Seguir
          </button>
        )}
      </header>

      {/* Foto do lugar */}
      <button
        type="button"
        onClick={() => onAbrirLugar(review.placeId)}
        aria-label={`Ver ${review.placeName}`}
        className="mt-3 block w-full overflow-hidden rounded-md cursor-pointer"
      >
        <PlaceImage src={foto} name={review.placeName} className="aspect-[16/10] w-full" />
      </button>

      {/* Lugar e nota */}
      <button
        type="button"
        onClick={() => onAbrirLugar(review.placeId)}
        className="mt-3 flex w-full items-center justify-between gap-3 text-left cursor-pointer"
      >
        <h3 className="min-w-0 truncate text-lg font-semibold tracking-tight text-ink">{review.placeName}</h3>
        <span className="flex shrink-0 items-center gap-1.5">
          <StarRating value={review.overall || 0} size={14} />
        </span>
      </button>

      {review.text && (
        <p className="mt-2 t-body text-ink-2 line-clamp-4">{review.text}</p>
      )}

      {review.pratoDestaque && (
        <p className="mt-2 text-sm text-muted truncate">
          Prato destaque: <span className="font-medium text-ink">{review.pratoDestaque}</span>
        </p>
      )}

      {/* Ações */}
      <div className="mt-2 flex items-center gap-5">
        <button
          type="button"
          onClick={curtir}
          aria-pressed={curtido}
          aria-label={`Curtir. ${curtidas} curtidas`}
          className={`${acao} ${curtido ? 'text-star' : 'text-muted hover:text-ink'}`}
        >
          <Heart size={18} strokeWidth={1.8} className={curtido ? 'fill-star' : ''} />
          <span>{curtidas}</span>
        </button>

        <button
          type="button"
          onClick={() => onComentarios(review)}
          aria-label={`Comentar. ${review.commentsCount || 0} comentários`}
          className={`${acao} text-muted hover:text-ink`}
        >
          <MessageCircle size={18} strokeWidth={1.8} />
          <span>{review.commentsCount || 0}</span>
        </button>

        <button
          type="button"
          onClick={() => onSalvar(review)}
          aria-pressed={salvo}
          aria-label={salvo ? 'Salvo em Quero ir' : 'Salvar em Quero ir'}
          className={`${acao} ${salvo ? 'text-primary' : 'text-muted hover:text-ink'}`}
        >
          <Bookmark size={18} strokeWidth={1.8} className={salvo ? 'fill-primary' : ''} />
          <span>{salvo ? 'Salvo' : 'Quero ir'}</span>
        </button>

        <button
          type="button"
          onClick={() => onCompartilhar(review)}
          aria-label="Compartilhar avaliação"
          className={`${acao} ml-auto text-muted hover:text-ink`}
        >
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}
