import React, { useState } from 'react';
import { Trophy, Star, Heart, MessageCircle, Sparkles, ChevronRight, Check } from 'lucide-react';
import type { Review } from '../types';
import PlacePlaceholder from './PlacePlaceholder';
import { alternarCurtida, verificarCurtida } from '../lib/reviews';

export default function DestaqueSemanaSection({
  review,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirComentarios,
  currentUserUid,
}: {
  review: Review;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirComentarios: (review: Review) => void;
  currentUserUid: string;
}) {
  const [curtido, setCurtido] = useState(() => verificarCurtida(review.id, currentUserUid));
  const [likesCount, setLikesCount] = useState(review.likesCount || 12);

  const handleCurtir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const novoStatus = await alternarCurtida(review.id, currentUserUid);
    setCurtido(novoStatus);
    setLikesCount((prev) => Math.max(0, prev + (novoStatus ? 1 : -1)));
  };

  const fotoPrincipal = review.photos?.[0] || review.placePhotoUrl;

  return (
    <section className="px-4 py-3">
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#18181B] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* Header Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100/60 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500">
              <Trophy size={16} />
            </div>
            <div>
              <span className="text-[12px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block leading-tight">
                Destaque da Semana
              </span>
              <span className="text-[11px] text-muted font-medium">
                Avaliação com maior engajamento
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full text-[12px] font-bold text-amber-600 dark:text-amber-400">
            <Sparkles size={11} />
            <span>Top 1</span>
          </div>
        </div>

        {/* Autor & Data */}
        <div className="flex items-center justify-between pt-3 pb-2">
          <button
            type="button"
            onClick={() => onAbrirPerfil(review.uid)}
            className="flex items-center gap-2.5 text-left group"
          >
            <img
              src={review.authorPhoto}
              alt={review.authorName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50 group-hover:scale-105 transition"
            />
            <div>
              <h4 className="font-bold text-xs text-ink group-hover:text-amber-600 transition flex items-center gap-1">
                <span>{review.authorName}</span>
                <Check size={11} className="text-amber-500" />
              </h4>
              <p className="text-[12px] text-muted">{review.authorHandle}</p>
            </div>
          </button>

          <span className="text-[12px] text-muted">
            {review.cityName || 'São Paulo'}
          </span>
        </div>

        {/* Conteúdo: Imagem do Prato + Restaurante + Texto */}
        <div className="space-y-3 pt-1">
          {/* Card do Restaurante / Foto */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onAbrirLugar(review.placeId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAbrirLugar(review.placeId);
            }}
            className="relative h-44 w-full rounded-2xl overflow-hidden group cursor-pointer shadow-xs"
          >
            {fotoPrincipal ? (
              <img
                src={fotoPrincipal}
                alt={review.placeName}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <PlacePlaceholder name={review.placeName} className="h-full w-full" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[12px] uppercase font-bold text-amber-300 tracking-wider block">
                    Experiência em Destaque
                  </span>
                  <h3 className="font-display text-lg font-bold text-white leading-tight drop-shadow-md">
                    {review.placeName}
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 shadow-sm">
                  <Star size={12} className="fill-amber-400" />
                  <span>{review.overall.toFixed(1).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Texto / Citação da Avaliação */}
          <p className="font-display text-sm italic text-ink/90 line-clamp-2 px-1">
            "{review.text}"
          </p>

          {/* Rodapé com Interações & Link para Detalhes */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100/60 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCurtir}
                className={`flex items-center gap-1.5 text-xs font-semibold transition active:scale-90 ${
                  curtido ? 'text-red-500' : 'text-muted hover:text-ink'
                }`}
              >
                <Heart size={16} className={curtido ? 'fill-red-500' : ''} />
                <span>{likesCount}</span>
              </button>

              <button
                type="button"
                onClick={() => onAbrirComentarios(review)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
              >
                <MessageCircle size={16} />
                <span>{review.commentsCount || 0}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onAbrirLugar(review.placeId)}
              className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
            >
              <span>Ver restaurante</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
