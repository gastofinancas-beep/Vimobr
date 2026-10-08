import React from 'react';
import { Utensils, ArrowUpRight, Search } from 'lucide-react';

interface TrendItem {
  id: string;
  title: string;
  subtitle: string;
  query: string;
}

const DEFAULT_TRENDS: TrendItem[] = [
  {
    id: 'top-100',
    title: 'Top 100 Cidade',
    subtitle: 'Mais bem avaliados',
    query: 'Melhores restaurantes',
  },
  {
    id: 'italian',
    title: 'Italiana & Massas',
    subtitle: 'Cantinas autênticas',
    query: 'Italiano',
  },
  {
    id: 'michelin',
    title: 'Estrelas da Guia',
    subtitle: 'Alta gastronomia',
    query: 'Alta gastronomia',
  },
  {
    id: 'drinks',
    title: 'Bares & Drinks',
    subtitle: 'Coquetéis artesanais',
    query: 'Bares',
  },
];

const RECENT_SEARCHES = [
  'Macaron',
  'Crepes',
  'Croissants',
  'Pizza Napolitana',
  'Hambúrguer Artesanal',
  'Café Especial',
  'Sushi',
];

interface CommunityTrendsGridProps {
  onSelectSearch?: (term: string) => void;
  onSeeAll?: () => void;
}

export default function CommunityTrendsGrid({
  onSelectSearch,
  onSeeAll,
}: CommunityTrendsGridProps) {
  return (
    <div className="space-y-6">
      {/* Buscas Recentes (Screen 3) */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
          Recent searches
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {RECENT_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onSelectSearch?.(term)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-[#18181B] text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-neutral-800 shadow-xs hover:border-[var(--star)] hover:text-[var(--star)] transition shrink-0 active:scale-95"
            >
              <Search size={12} className="text-gray-400" />
              <span>{term}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Community Trends (Screen 3) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Community trends
          </h3>
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--star)] flex items-center gap-1 transition"
          >
            <span>See All</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* 2x2 Grid com Bordas Orgânicas (Screen 3) */}
        <div className="grid grid-cols-2 gap-3.5">
          {DEFAULT_TRENDS.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectSearch?.(t.query)}
              className="group p-4 rounded-[26px] bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md hover:border-[var(--star)]/50 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[118px]"
            >
              {/* Topo do card: Garfo amarelo na esquerda + Seta na direita */}
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-[var(--star)] text-white flex items-center justify-center shadow-xs">
                  <Utensils size={14} className="stroke-[2.4]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-neutral-800 flex items-center justify-center text-gray-400 group-hover:text-[var(--star)] group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 transition">
                  <ArrowUpRight size={15} strokeWidth={2.4} />
                </div>
              </div>

              {/* Textos */}
              <div className="mt-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[var(--star)] transition leading-tight">
                  {t.title}
                </h4>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                  {t.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
