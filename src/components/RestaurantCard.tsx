import React from 'react';
import { Star, MapPin, Heart, Bookmark, Check, ArrowUpRight, Clock } from 'lucide-react';

export interface RestaurantCardProps {
  image: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  priceRange?: string;
  distance?: string | number;
  location?: string;
  isOpen?: boolean;
  isSaved?: boolean;
  isWishlist?: boolean;
  hasVisited?: boolean;
  userRating?: number;
  variant?: 'default' | 'compact' | 'horizontal' | 'map';
  onClick?: () => void;
  onToggleSave?: (e: React.MouseEvent) => void;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onToggleVisited?: (e: React.MouseEvent) => void;
  className?: string;
}

export default function RestaurantCard({
  image,
  name,
  rating = 4.5,
  reviewCount,
  category = 'Restaurante',
  priceRange = '$$',
  distance,
  location,
  isOpen,
  isSaved = false,
  isWishlist = false,
  hasVisited = false,
  userRating,
  variant = 'default',
  onClick,
  onToggleSave,
  onToggleWishlist,
  onToggleVisited,
  className = '',
}: RestaurantCardProps) {
  const formattedDistance =
    typeof distance === 'number'
      ? distance < 1
        ? `${Math.round(distance * 1000)} m`
        : `${distance.toFixed(1).replace('.', ',')} km`
      : distance;

  // 1. Variante Map (Bottom Sheet / Card Flutuante de visualização no mapa)
  if (variant === 'map') {
    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-[#171E1A] rounded-[24px] p-3.5 shadow-xl border border-[#E5EAE6] dark:border-[#26332C] flex items-center gap-3.5 cursor-pointer hover:border-[#0D3E2F]/40 transition-all ${className}`}
      >
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-[#F0F3F1] dark:bg-[#1E2722]">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {hasVisited && (
            <div className="absolute top-1 left-1 bg-[#0D3E2F] text-white p-1 rounded-full shadow-sm">
              <Check size={10} strokeWidth={3} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="font-semibold text-sm text-[#141715] dark:text-[#F2F5F3] truncate">
              {name}
            </h4>
            {rating && (
              <span className="flex items-center gap-1 text-xs font-bold text-[#141715] dark:text-[#F2F5F3] shrink-0">
                <Star size={12} className="fill-[var(--star)] text-[var(--star)]" />
                {rating.toFixed(1).replace('.', ',')}
              </span>
            )}
          </div>

          <p className="text-xs text-[#636C66] dark:text-[#95A199] truncate mb-2">
            {category} {priceRange ? `· ${priceRange}` : ''}
          </p>

          <div className="flex items-center justify-between text-xs">
            {formattedDistance ? (
              <span className="text-[#636C66] dark:text-[#95A199] font-medium flex items-center gap-1">
                <MapPin size={11} className="text-[#0D3E2F]" />
                {formattedDistance}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D3E2F] dark:text-[#2DD4BF] group">
              Ver restaurante <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Variante Horizontal (Linha em feeds e listas compactas)
  if (variant === 'horizontal') {
    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-[#171E1A] rounded-[24px] p-3 border border-[#E5EAE6] dark:border-[#26332C] flex items-center gap-3.5 cursor-pointer hover:border-[#0D3E2F]/40 transition-all ${className}`}
      >
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-[#F0F3F1] dark:bg-[#1E2722]">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          {hasVisited && (
            <span className="absolute top-1.5 left-1.5 bg-[#0D3E2F] text-white text-[12px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Check size={9} strokeWidth={3} /> Já fui
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="font-semibold text-sm text-[#141715] dark:text-[#F2F5F3] truncate">
              {name}
            </h4>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(e);
              }}
              className="text-[#636C66] hover:text-[#0D3E2F] dark:hover:text-white transition p-1"
            >
              <Heart
                size={16}
                className={isSaved ? 'fill-[#DC2626] text-[#DC2626]' : 'stroke-[1.8]'}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#636C66] dark:text-[#95A199] mb-2">
            <span className="flex items-center gap-1 font-bold text-[#141715] dark:text-[#F2F5F3]">
              <Star size={12} className="fill-[var(--star)] text-[var(--star)]" />
              {rating.toFixed(1).replace('.', ',')}
            </span>
            <span>·</span>
            <span className="truncate">{category}</span>
            <span>·</span>
            <span>{priceRange}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8F9992]">
            <span className="truncate flex items-center gap-1">
              <MapPin size={11} className="shrink-0 text-[#0D3E2F]" />
              {location || formattedDistance || 'São Paulo'}
            </span>
            {userRating && (
              <span className="text-[11px] font-bold text-[#0D3E2F] bg-[#EBF3EE] dark:bg-[#1A3127] px-2 py-0.5 rounded-full">
                Sua nota: {userRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Variante Compacta (Grid de 2 colunas estilo referência)
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`group bg-white dark:bg-[#171E1A] rounded-[24px] overflow-hidden border border-[#E5EAE6] dark:border-[#26332C] hover:border-[#0D3E2F]/40 transition-all cursor-pointer flex flex-col ${className}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F0F3F1] dark:bg-[#1E2722]">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Botão de Salvar discreto */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(e);
            }}
            aria-label="Salvar restaurante"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-[#171E1A]/90 backdrop-blur-md flex items-center justify-center text-[#141715] dark:text-[#F2F5F3] shadow-sm hover:scale-105 transition"
          >
            <Heart
              size={14}
              className={isSaved ? 'fill-[#DC2626] text-[#DC2626]' : 'stroke-[1.8]'}
            />
          </button>

          {/* Badge Já Fui */}
          {hasVisited && (
            <div className="absolute top-2.5 left-2.5 bg-[#0D3E2F] text-white text-[12px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Check size={10} strokeWidth={3} /> Já fui
            </div>
          )}

          {/* Barra inferior translúcida inspirada na referência */}
          <div className="absolute bottom-2.5 inset-x-2.5 bg-white/90 dark:bg-[#171E1A]/90 backdrop-blur-md rounded-2xl py-1.5 px-2.5 flex items-center justify-between text-xs shadow-sm">
            <span className="text-[11px] font-semibold text-[#0D3E2F] dark:text-[#2DD4BF] flex items-center gap-1 truncate">
              Ver mais
            </span>
            <div className="w-5 h-5 rounded-full bg-[#0D3E2F] text-white flex items-center justify-center shrink-0">
              <ArrowUpRight size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="font-semibold text-sm text-[#141715] dark:text-[#F2F5F3] truncate">
              {name}
            </h4>
            <span className="flex items-center gap-0.5 text-xs font-bold text-[#141715] dark:text-[#F2F5F3] shrink-0">
              <Star size={12} className="fill-[var(--star)] text-[var(--star)]" />
              {rating.toFixed(1).replace('.', ',')}
            </span>
          </div>

          <p className="text-xs text-[#636C66] dark:text-[#95A199] truncate mb-1">
            {category} {priceRange ? `· ${priceRange}` : ''}
          </p>

          {formattedDistance && (
            <p className="text-[11px] text-[#8F9992] flex items-center gap-1">
              <MapPin size={10} className="text-[#0D3E2F]" />
              {formattedDistance}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 4. Variante Default (Card Grande Premium com Imagem de Destaque, Fundo Claro e Verde Escuro)
  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-[#171E1A] rounded-[28px] overflow-hidden border border-[#E5EAE6] dark:border-[#26332C] hover:border-[#0D3E2F]/40 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col ${className}`}
    >
      {/* Imagem de Destaque com visual limpo e espaçoso */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F0F3F1] dark:bg-[#1E2722]">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Status Aberto / Fechado sutil no topo esquerdo */}
        {isOpen !== undefined && (
          <div className="absolute top-3.5 left-3.5 bg-white/90 dark:bg-[#171E1A]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-[#141715] dark:text-[#F2F5F3] flex items-center gap-1.5 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isOpen ? 'bg-[#16A34A]' : 'bg-[#636C66]'
              }`}
            />
            <span>{isOpen ? 'Aberto' : 'Fechado'}</span>
          </div>
        )}

        {/* Badges de Ação no topo direito (Salvar / Quero ir / Já fui) */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
          {hasVisited && (
            <span className="bg-[#0D3E2F] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Check size={11} strokeWidth={3} /> Já fui
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(e);
            }}
            aria-label="Salvar na coleção"
            className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#171E1A]/90 backdrop-blur-md flex items-center justify-center text-[#141715] dark:text-[#F2F5F3] shadow-sm hover:scale-105 transition"
          >
            <Heart
              size={16}
              className={isSaved ? 'fill-[#DC2626] text-[#DC2626]' : 'stroke-[1.8]'}
            />
          </button>
        </div>

        {/* Barra Translúcida Estilo Referência com Ação Principal */}
        <div className="absolute bottom-3.5 inset-x-3.5 bg-white/90 dark:bg-[#171E1A]/90 backdrop-blur-md rounded-[20px] p-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 pl-1.5">
            <div className="w-8 h-8 rounded-full bg-[#0D3E2F] text-white flex items-center justify-center">
              <Star size={14} className="fill-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#141715] dark:text-[#F2F5F3] block">
                {rating.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-[12px] text-[#636C66] dark:text-[#95A199] block leading-none">
                {reviewCount ? `${reviewCount} avaliações` : 'Excelente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D3E2F] text-white text-xs font-semibold group-hover:bg-[#082A20] transition">
            <span>Ver perfil</span>
            <ArrowUpRight size={13} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Conteúdo Informativo */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-base sm:text-lg text-[#141715] dark:text-[#F2F5F3] tracking-tight truncate">
            {name}
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-[#636C66] dark:text-[#95A199] mb-3">
          {category} {priceRange ? `· ${priceRange}` : ''}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5EAE6] dark:border-[#26332C] text-xs text-[#8F9992]">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={12} className="text-[#0D3E2F] shrink-0" />
            {location || formattedDistance || 'São Paulo, SP'}
          </span>

          {formattedDistance && (
            <span className="font-semibold text-[#0D3E2F] dark:text-[#2DD4BF] shrink-0">
              {formattedDistance}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Exportando aliases para as variantes
export function RestaurantCardCompact(props: Omit<RestaurantCardProps, 'variant'>) {
  return <RestaurantCard {...props} variant="compact" />;
}

export function RestaurantCardHorizontal(props: Omit<RestaurantCardProps, 'variant'>) {
  return <RestaurantCard {...props} variant="horizontal" />;
}

export function RestaurantCardMap(props: Omit<RestaurantCardProps, 'variant'>) {
  return <RestaurantCard {...props} variant="map" />;
}
