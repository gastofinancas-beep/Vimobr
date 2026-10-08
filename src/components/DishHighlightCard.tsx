import React, { useState } from 'react';
import { Flame, Star, ThumbsUp, Sparkles, Trash2, Tag, Utensils } from 'lucide-react';
import StarRating from './StarRating';
import { alternarVotoPrato, excluirDestaquePrato } from '../lib/dishes';
import type { DishHighlight, UserProfile } from '../types';

export default function DishHighlightCard({
  dish,
  currentUser,
  onAbrirPerfil,
  onAtualizado,
}: {
  dish: DishHighlight;
  currentUser: UserProfile;
  onAbrirPerfil?: (uid: string) => void;
  onAtualizado?: () => void;
}) {
  const [votando, setVotando] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (votando) return;
    setVotando(true);
    alternarVotoPrato(dish.id, currentUser.uid);
    onAtualizado?.();
    setVotando(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir este destaque de prato?')) {
      excluirDestaquePrato(dish.id);
      onAtualizado?.();
    }
  };

  const isAuthor = currentUser.uid === dish.author.uid;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-line bg-s1 transition-all duration-300 hover:border-[#42392E] hover:shadow-xl flex flex-col">
      {/* Foto do Prato com Badge "Imperdível" */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-s2">
        {dish.photoUrl && !imgError ? (
          <img
            src={dish.photoUrl}
            alt={dish.dishName}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#2B231A] to-[#171412] p-4 text-center">
            <Utensils size={28} className="text-[#D0C5B4] mb-1 opacity-70" />
            <span className="font-display text-sm font-semibold text-[#D0C5B4]">{dish.dishName}</span>
          </div>
        )}

        {/* Gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Badge "IMPERDÍVEL" em destaque */}
        {dish.isMustTry && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-bg shadow-lg shadow-accent/25 ring-2 ring-bg/50 animate-in fade-in duration-300">
            <Flame size={13} className="fill-bg" />
            <span>Imperdível</span>
          </div>
        )}

        {/* Categoria e Preço no topo direito */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {dish.price && (
            <span className="rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-accent shadow border border-white/10">
              {dish.price}
            </span>
          )}
        </div>

        {/* Nota Própria do Prato na base da imagem */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
          <span className="rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[12px] font-semibold text-[#D0C5B4] border border-white/10">
            {dish.category}
          </span>

          <div className="flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 border border-accent/40 shadow">
            <Star size={13} className="fill-accent text-accent" />
            <span className="font-bold text-xs text-accent">
              {dish.rating.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-[12px] text-white/60">/ 5,0</span>
          </div>
        </div>
      </div>

      {/* Detalhes do Prato */}
      <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h4 className="font-display text-base sm:text-lg font-bold text-ink group-hover:text-accent transition leading-snug">
            {dish.dishName}
          </h4>

          {dish.comment && (
            <p className="text-xs italic text-[#DDD3C4] font-sans leading-relaxed line-clamp-3">
              “{dish.comment}”
            </p>
          )}
        </div>

        {/* Autor que indicou & Votos da Comunidade */}
        <div className="pt-2 border-t border-line/50 flex items-center justify-between gap-2">
          {/* Autor */}
          <button
            type="button"
            onClick={() => onAbrirPerfil?.(dish.author.uid)}
            className="flex items-center gap-2 min-w-0 text-left group/author"
            title={`Indicado por ${dish.author.name}`}
          >
            <img
              src={dish.author.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${dish.author.name}`}
              alt=""
              className="h-6 w-6 rounded-full object-cover border border-accent shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-ink truncate group-hover/author:text-accent block">
                {dish.author.name.split(' ')[0]}
              </span>
              <span className="text-[12px] text-muted truncate block">
                {dish.author.handle}
              </span>
            </div>
          </button>

          {/* Botão de Upvote / "Também achei imperdível!" */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleVote}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                dish.userVoted
                  ? 'bg-accent text-bg shadow-accent/20 ring-1 ring-accent'
                  : 'bg-s2 border border-line text-muted hover:text-ink hover:border-accent'
              }`}
              title={dish.userVoted ? 'Você recomendou este prato' : 'Recomendar este prato'}
            >
              <Flame
                size={13}
                className={dish.userVoted ? 'fill-bg text-bg' : 'text-accent'}
              />
              <span>{dish.votesCount}</span>
            </button>

            {isAuthor && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-muted hover:text-red-400 transition rounded-full hover:bg-s2"
                title="Excluir minha indicação"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
