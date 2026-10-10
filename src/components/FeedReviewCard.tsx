import React, { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, PlaceImage, RatingBadge, card } from './ui';
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

  // Atualiza na hora; a gravação local é imediata e o Firestore segue em segundo plano
  const curtir = () => {
    const agora = !curtido;
    setCurtido(agora);
    setCurtidas((c) => Math.max(0, c + (agora ? 1 : -1)));
    alternarCurtida(review.id, currentUser.uid).catch((err) => console.warn('Falha ao curtir:', err));
  };

  const quando = tempoRelativo(review.visitedAt || review.createdAt || Date.now());
  const cidade = review.cityName ? review.cityName.replace(/\s*-\s*[A-Z]{2}$/, '') : '';

  return (
    <article className={`${card} p-3.5`}>
      {/* Quem avaliou */}
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onAbrirPerfil(review.uid)}
          className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer"
        >
          <Avatar src={review.authorPhoto} name={review.authorName} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-ink">{review.authorName}</span>
            <span className="block t-meta">{[quando, cidade].filter(Boolean).join(' · ')}</span>
          </span>
        </button>

        {!ehMeu && !seguindo && (
          <button
            type="button"
            onClick={() => onSeguir(review.uid)}
            className="h-8 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Seguir
          </button>
        )}
      </header>

      {/* Foto do lugar com a nota */}
      <button
        type="button"
        onClick={() => onAbrirLugar(review.placeId)}
        aria-label={`Ver ${review.placeName}`}
        className="relative mt-3 block w-full overflow-hidden rounded-xl cursor-pointer"
      >
        <PlaceImage src={foto} name={review.placeName} className="aspect-[16/10] w-full" />
        {review.overall > 0 && <RatingBadge nota={review.overall} className="absolute right-3 top-3" />}
      </button>

      {/* Lugar e texto */}
      <button
        type="button"
        onClick={() => onAbrirLugar(review.placeId)}
        className="mt-3 block w-full text-left cursor-pointer"
      >
        <h3 className="truncate text-[17px] font-semibold tracking-tight text-ink">{review.placeName}</h3>
      </button>
      {review.text && <p className="mt-1 text-[15px] leading-relaxed text-ink-2 line-clamp-3">{review.text}</p>}
      {review.pratoDestaque && (
        <p className="mt-1.5 truncate text-sm text-muted">
          Prato destaque: <span className="font-medium text-ink">{review.pratoDestaque}</span>
        </p>
      )}

      {/* Ações */}
      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          onClick={curtir}
          aria-pressed={curtido}
          aria-label={`Curtir. ${curtidas} curtidas`}
          className={`${acao} ${curtido ? 'text-like' : 'text-ink-2 hover:text-ink'}`}
        >
          <Heart size={20} strokeWidth={1.9} className={`transition-transform ${curtido ? 'fill-like scale-110' : ''}`} />
          <span>{curtidas}</span>
        </button>

        <button
          type="button"
          onClick={() => onComentarios(review)}
          aria-label={`Comentar. ${review.commentsCount || 0} comentários`}
          className={`${acao} text-ink-2 hover:text-ink`}
        >
          <MessageCircle size={20} strokeWidth={1.9} />
          <span>{review.commentsCount || 0}</span>
        </button>

        <button
          type="button"
          onClick={() => onCompartilhar(review)}
          aria-label="Compartilhar avaliação"
          className={`${acao} text-ink-2 hover:text-ink`}
        >
          <Share2 size={19} strokeWidth={1.9} />
        </button>

        <button
          type="button"
          onClick={() => onSalvar(review)}
          aria-pressed={salvo}
          aria-label={salvo ? 'Salvo em Quero ir' : 'Salvar em Quero ir'}
          className={`${acao} ml-auto ${salvo ? 'text-primary' : 'text-ink-2 hover:text-ink'}`}
        >
          <Bookmark size={20} strokeWidth={1.9} className={salvo ? 'fill-primary' : ''} />
        </button>
      </div>
    </article>
  );
}
