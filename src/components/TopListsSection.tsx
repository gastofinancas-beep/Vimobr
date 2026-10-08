import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Flame,
  Bookmark,
  ChevronRight,
  Sparkles,
  Medal,
  Award,
  Utensils,
} from 'lucide-react';
import { photoUrl } from '../lib/places';
import { TOP_LIST_CATEGORIES, obterRankingsPorCategoria } from '../lib/rankings';
import { alternarWishlist, estaNaWishlist } from '../lib/wishlist';
import TopListModal from './TopListModal';
import type { Place, RankingItem, TopListCategory, UserProfile } from '../types';

export default function TopListsSection({
  currentUser,
  cidadeKey,
  onAbrirLugar,
}: {
  currentUser: UserProfile;
  cidadeKey?: string;
  onAbrirLugar: (p: Place) => void;
}) {
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>('cafes');
  const [categoriaModal, setCategoriaModal] = useState<TopListCategory | null>(null);
  const [salvos, setSalvos] = useState<Record<string, boolean>>({});

  const categoriaAtiva =
    TOP_LIST_CATEGORIES.find((c) => c.id === categoriaAtivaId) ||
    TOP_LIST_CATEGORIES[0];

  const rankings = obterRankingsPorCategoria(categoriaAtivaId, cidadeKey);

  const handleToggleSalvar = async (e: React.MouseEvent, place: Place) => {
    e.stopPropagation();
    const res = await alternarWishlist(currentUser.uid, place);
    setSalvos((prev) => ({ ...prev, [place.id]: res.added }));
  };

  return (
    <section className="pt-2 pb-2">
      {/* Header da Seção */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
            <Trophy size={15} className="fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink leading-none">
              Rankings & Top Lists
            </h2>
            <span className="text-[11px] text-muted">
              Curadoria e notas da comunidade
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCategoriaModal(categoriaAtiva)}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-0.5 transition"
        >
          <span>Ver Ranking</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Seletor de Categorias em Chips com Ícones */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 no-scrollbar">
        {TOP_LIST_CATEGORIES.map((cat) => {
          const ativo = cat.id === categoriaAtivaId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaAtivaId(cat.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition shrink-0 active:scale-95 ${
                ativo
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
              }`}
            >
              <span>{cat.nome.replace('Melhor ', '').replace('Melhores ', '').replace('Top ', '')}</span>
            </button>
          );
        })}
      </div>

      {/* Cards do Pódio Horizontal */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {rankings.slice(0, 5).map((item) => {
          const foto =
            item.place.photoUrl || photoUrl(item.place.photoName, 500);
          const isSalvo =
            salvos[item.place.id] ??
            estaNaWishlist(currentUser.uid, item.place.id);

          const medalhaBg =
            item.posicao === 1
              ? 'bg-amber-400 text-gray-950 font-black shadow-xs'
              : item.posicao === 2
              ? 'bg-slate-200 text-slate-800 font-bold'
              : item.posicao === 3
              ? 'bg-amber-100 text-amber-900 font-bold'
              : 'bg-black/75 text-white/90';

          return (
            <div
              key={item.place.id}
              onClick={() => onAbrirLugar(item.place)}
              className="group relative w-[220px] sm:w-[240px] shrink-0 overflow-hidden rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-lg transition duration-300 cursor-pointer flex flex-col justify-between"
            >
              {/* Imagem do Estabelecimento com Medalha e Nota */}
              <div className="relative h-32 w-full overflow-hidden bg-s2">
                {foto ? (
                  <img
                    src={foto}
                    alt={item.place.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-s2">
                    <Utensils size={24} className="text-muted opacity-60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badge de Posição (1º, 2º, 3º lugar) */}
                <div
                  className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1 shadow-lg ${medalhaBg}`}
                >
                  <Trophy size={11} />
                  <span>#{item.posicao}</span>
                </div>

                {/* Nota da Comunidade */}
                <div className="absolute top-2.5 right-2.5 rounded-full bg-black/80 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-accent border border-accent/30 flex items-center gap-1 shadow">
                  <Star size={11} className="fill-accent text-accent" />
                  <span>{item.notaGeral.toFixed(1).replace('.', ',')}</span>
                </div>

                {/* Preço e Tipo */}
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[12px] text-white/80">
                  <span className="truncate max-w-[120px] font-medium">
                    {item.place.cityName}
                  </span>
                  <span className="font-semibold text-accent">
                    {item.totalAvaliacoes} avaliações
                  </span>
                </div>
              </div>

              {/* Informações do Lugar */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-display text-sm font-bold text-ink group-hover:text-accent transition truncate leading-snug">
                      {item.place.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleToggleSalvar(e, item.place)}
                      className={`p-1 rounded-full transition shrink-0 ${
                        isSalvo
                          ? 'text-accent'
                          : 'text-muted hover:text-ink'
                      }`}
                      title={isSalvo ? 'Salvo na Wishlist' : 'Salvar na Wishlist'}
                    >
                      <Bookmark size={15} className={isSalvo ? 'fill-accent' : ''} />
                    </button>
                  </div>

                  {/* Prato Mais Votado */}
                  {item.pratoDestaque ? (
                    <div className="flex items-center gap-1 text-[12px] text-[#CFC5B6] mt-1 truncate">
                      <Flame size={11} className="text-accent shrink-0 fill-accent" />
                      <span className="text-muted">Top:</span>
                      <span className="text-accent font-semibold truncate">
                        {item.pratoDestaque.nome}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted truncate mt-1">
                      {item.place.address}
                    </p>
                  )}
                </div>

                {/* Critérios Rápidos: Comida & Ambiente */}
                <div className="flex items-center justify-between pt-1.5 border-t border-line/40 text-[12px] text-muted">
                  <span>
                    Comida <b className="text-ink">{item.medias.comida.toFixed(1)}</b>
                  </span>
                  <span>·</span>
                  <span>
                    Ambiente <b className="text-ink">{item.medias.ambiente.toFixed(1)}</b>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card Final: Ver Todos */}
        <button
          type="button"
          onClick={() => setCategoriaModal(categoriaAtiva)}
          className="w-[140px] shrink-0 rounded-3xl border border-dashed border-line/80 bg-s1/50 hover:bg-s1 hover:border-accent p-4 flex flex-col items-center justify-center text-center space-y-2 group transition"
        >
          <div className="h-10 w-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:scale-110 transition">
            <Trophy size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-ink">Ver ranking completo</p>
            <p className="text-[12px] text-muted mt-0.5">{rankings.length} lugares</p>
          </div>
        </button>
      </div>

      {/* Modal Completo do Ranking da Categoria */}
      {categoriaModal && (
        <TopListModal
          categoria={categoriaModal}
          rankings={obterRankingsPorCategoria(categoriaModal.id, cidadeKey)}
          currentUser={currentUser}
          onClose={() => setCategoriaModal(null)}
          onAbrirLugar={onAbrirLugar}
        />
      )}
    </section>
  );
}
