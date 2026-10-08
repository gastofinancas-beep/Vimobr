import React from 'react';
import { Star, MapPin, Navigation, Utensils } from 'lucide-react';
import type { FsqNormalizedPlace } from '../../types/foursquare';

interface FsqPlaceCardProps {
  place: FsqNormalizedPlace;
  isSelected?: boolean;
  onClick?: () => void;
  layout?: 'horizontal' | 'compact' | 'list';
}

export default function FsqPlaceCard({
  place,
  isSelected = false,
  onClick,
  layout = 'horizontal',
}: FsqPlaceCardProps) {
  const isHoriz = layout === 'horizontal';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
      }}
      className={`group relative shrink-0 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isSelected ? 'ring-2 ring-amber-500 shadow-md' : ''
      } ${
        isHoriz
          ? 'w-[240px] sm:w-[260px] snap-start'
          : layout === 'list'
          ? 'w-full'
          : 'w-[220px]'
      }`}
    >
      {/* 1. Foto Real da Foursquare */}
      <div className="relative h-36 w-full bg-neutral-900 overflow-hidden">
        {place.primaryPhoto ? (
          <img
            src={place.primaryPhoto}
            alt={place.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-neutral-800 text-neutral-400">
            <Utensils size={32} className="opacity-60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Selo de Nota Foursquare / 5 estrelas */}
        {place.rating5 !== null && (
          <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[12px] font-bold text-amber-400 flex items-center gap-1 shadow-sm">
            <Star size={11} className="fill-amber-400" />
            <span>{place.rating5.toFixed(1).replace('.', ',')}</span>
          </div>
        )}

        {/* Status Aberto Agora */}
        {place.openNow !== null && (
          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[12px] font-semibold text-white flex items-center gap-1 shadow-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                place.openNow ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span>{place.openNow ? 'Aberto' : 'Fechado'}</span>
          </div>
        )}

        {/* Nome do Restaurante sobre a imagem */}
        <div className="absolute bottom-2.5 inset-x-3">
          <h3 className="font-display text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition">
            {place.name}
          </h3>
        </div>
      </div>

      {/* 2. Informações Detalhadas */}
      <div className="p-3.5 space-y-1.5">
        {/* Linha 1: Avaliação e Quantidade */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-300 font-semibold">
          {place.rating5 !== null ? (
            <>
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star size={11} className="fill-amber-500" />
                <span>{place.rating5.toFixed(1).replace('.', ',')}</span>
              </span>
              {place.ratingsCount ? (
                <>
                  <span>·</span>
                  <span className="text-gray-400 font-normal">
                    {place.ratingsCount.toLocaleString('pt-BR')} avaliações
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <span className="text-gray-400 font-normal">Sem avaliações ainda</span>
          )}
        </div>

        {/* Linha 2: Categoria · Preço */}
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium truncate">{place.category}</span>
          {place.priceLevel && (
            <>
              <span>·</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {place.priceLevel}
              </span>
            </>
          )}
        </div>

        {/* Linha 3: Distância real aproximada e Bairro/Região */}
        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
          <Navigation size={11} className="text-amber-500 shrink-0" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {place.distanceFormatted}
          </span>
          {place.shortAddress && (
            <>
              <span>·</span>
              <span className="truncate">{place.shortAddress}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
