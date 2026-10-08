import React from 'react';
import { Heart, ArrowUpRight, Utensils } from 'lucide-react';
import type { Place } from '../types';

interface ModernFeaturedCardProps {
  place: Place;
  isFavorited?: boolean;
  onToggleFavorite?: (placeId: string) => void;
  onOpenPlace: (place: Place) => void;
  variant?: 'hero' | 'compact';
}

export default function ModernFeaturedCard({
  place,
  isFavorited = false,
  onToggleFavorite,
  onOpenPlace,
  variant = 'hero',
}: ModernFeaturedCardProps) {
  const photo =
    place.coverImage ||
    place.photos?.[0] ||
    place.photoUrl ||
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onOpenPlace(place)}
        className="group relative h-[195px] rounded-[24px] overflow-hidden cursor-pointer shadow-xs hover:shadow-lg transition-all duration-300 bg-white dark:bg-neutral-900 border border-gray-150/70 dark:border-neutral-800"
      >
        {/* Imagem de Fundo */}
        <img
          src={photo}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradiente sutil para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

        {/* Botão de Favorito no topo direito */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(place.id);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-xs transition hover:scale-110 active:scale-90"
          aria-label="Salvar favorito"
        >
          <Heart
            size={13}
            className={`transition-colors ${
              isFavorited
                ? 'fill-red-500 text-red-500'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          />
        </button>

        {/* Barra Flutuante em Vidro Fosco (Glassmorphism Capsule) */}
        <div className="absolute bottom-2 inset-x-2 backdrop-blur-md bg-white/65 dark:bg-black/65 border border-white/70 dark:border-white/20 rounded-full p-1 flex items-center justify-between shadow-md">
          {/* Badge Ícone de Garfo Amarelo Quente */}
          <div className="w-6 h-6 rounded-full bg-[var(--star)] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Utensils size={11} className="stroke-[2.5]" />
          </div>

          {/* Texto Central */}
          <span className="text-[12px] font-bold text-gray-900 dark:text-white px-1 truncate max-w-[70px]">
            View more &gt;&gt;&gt;
          </span>

          {/* Botão com Seta Diagonal ↗ */}
          <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-white/25 backdrop-blur-xs flex items-center justify-center text-gray-900 dark:text-white shrink-0 group-hover:bg-[var(--star)] group-hover:text-white transition">
            <ArrowUpRight size={12} strokeWidth={2.4} />
          </div>
        </div>
      </div>
    );
  }

  // Versão Hero (Cards grandes da Screen 1)
  return (
    <div
      onClick={() => onOpenPlace(place)}
      className="group relative h-[230px] sm:h-[270px] w-full rounded-[30px] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 bg-white dark:bg-neutral-900 border border-gray-150/70 dark:border-neutral-800"
    >
      {/* Imagem de Fundo com zoom suave no hover */}
      <img
        src={photo}
        alt={place.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* Gradiente escurecedor suave */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Categoria Flutuante Superior */}
      <div className="absolute top-3.5 left-4">
        <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-gray-900 dark:text-white text-[11px] font-bold tracking-wide shadow-xs border border-white/40">
          {place.cuisine || place.category || place.tipo || 'Gastronomia'}
        </span>
      </div>

      {/* Botão de Favorito no topo direito (Screen 1) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.(place.id);
        }}
        className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-sm transition hover:scale-110 active:scale-90"
        aria-label="Salvar favorito"
      >
        <Heart
          size={17}
          className={`transition-colors ${
            isFavorited
              ? 'fill-red-500 text-red-500'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        />
      </button>

      {/* Barra de Ação Flutuante em Vidro Fosco (Screen 1 Signature Overlay) */}
      <div className="absolute bottom-3 inset-x-3 backdrop-blur-md bg-white/65 dark:bg-black/65 border border-white/70 dark:border-white/20 rounded-full p-1.5 flex items-center justify-between shadow-lg">
        {/* Círculo com Garfo Amarelo Quente */}
        <div className="w-9 h-9 rounded-full bg-[var(--star)] text-white flex items-center justify-center shrink-0 shadow-xs">
          <Utensils size={15} className="stroke-[2.4]" />
        </div>

        {/* Texto "View more >>>" / Nome do Estabelecimento */}
        <div className="flex items-center gap-1.5 text-center px-2 min-w-0">
          <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
            {place.name}
          </span>
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">
            &bull; View more &gt;&gt;&gt;
          </span>
        </div>

        {/* Botão Redondo com Seta Diagonal ↗ */}
        <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-white/25 backdrop-blur-md flex items-center justify-center text-gray-900 dark:text-white shrink-0 group-hover:bg-[var(--star)] group-hover:text-white transition shadow-xs">
          <ArrowUpRight size={17} strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}
