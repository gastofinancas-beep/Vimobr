import React, { useState } from 'react';
import {
  X,
  Trophy,
  Medal,
  Star,
  Flame,
  Bookmark,
  Check,
  ChevronRight,
  Share2,
  MapPin,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { photoUrl } from '../lib/places';
import { alternarWishlist, estaNaWishlist } from '../lib/wishlist';
import type { Place, RankingItem, TopListCategory, UserProfile } from '../types';

export default function TopListModal({
  categoria,
  rankings,
  currentUser,
  onClose,
  onAbrirLugar,
}: {
  categoria: TopListCategory;
  rankings: RankingItem[];
  currentUser: UserProfile;
  onClose: () => void;
  onAbrirLugar: (p: Place) => void;
}) {
  const [salvos, setSalvos] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    rankings.forEach((r) => {
      map[r.place.id] = estaNaWishlist(currentUser.uid, r.place.id);
    });
    return map;
  });

  const [toast, setToast] = useState<string | null>(null);

  const handleToggleSalvar = async (e: React.MouseEvent, place: Place) => {
    e.stopPropagation();
    const res = await alternarWishlist(currentUser.uid, place);
    setSalvos((prev) => ({ ...prev, [place.id]: res.added }));
    setToast(res.added ? `"${place.name}" salvo na Wishlist!` : 'Removido da Wishlist');
    setTimeout(() => setToast(null), 2500);
  };

  const handleSalvarTodosTop3 = async () => {
    for (const item of rankings.slice(0, 3)) {
      if (!salvos[item.place.id]) {
        await alternarWishlist(currentUser.uid, item.place);
      }
    }
    const map: Record<string, boolean> = { ...salvos };
    rankings.slice(0, 3).forEach((r) => {
      map[r.place.id] = true;
    });
    setSalvos(map);
    setToast('Top 3 adicionado à sua Lista de Desejos!');
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Bookmark size={14} className="fill-bg" />
          <span>{toast}</span>
        </div>
      )}

      <div
        className="w-full sm:max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Banner da Categoria */}
        <div className="relative p-5 border-b border-line bg-gradient-to-r from-[#2A231C] to-s1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-inner shrink-0">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                  Ranking Oficial VIMO
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-ink mt-0.5">
                {categoria.nome}
              </h2>
              <p className="text-xs text-muted max-w-sm mt-0.5">
                {categoria.descricao}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted hover:text-ink hover:bg-s2 transition self-start"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Ação Rápida */}
        <div className="px-5 py-2.5 bg-s2/60 border-b border-line/60 flex items-center justify-between text-xs text-muted shrink-0">
          <span>{rankings.length} lugares no ranking com base em notas da comunidade</span>
          <button
            type="button"
            onClick={handleSalvarTodosTop3}
            className="inline-flex items-center gap-1.5 font-bold text-accent hover:underline text-xs"
          >
            <Bookmark size={13} className="fill-accent" />
            <span>Salvar Top 3 na Wishlist</span>
          </button>
        </div>

        {/* Lista Classificada (1º ao último) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 no-scrollbar">
          {rankings.map((item) => {
            const foto =
              item.place.photoUrl || photoUrl(item.place.photoName, 400);
            const salvo = !!salvos[item.place.id];

            const medalColor =
              item.posicao === 1
                ? 'from-amber-400 to-yellow-600 text-bg ring-2 ring-amber-300/80 shadow-amber-500/30'
                : item.posicao === 2
                ? 'from-slate-200 to-slate-400 text-slate-900 ring-2 ring-slate-300 shadow-slate-400/20'
                : item.posicao === 3
                ? 'from-amber-700 to-amber-900 text-amber-100 ring-2 ring-amber-600 shadow-amber-800/20'
                : 'bg-s2 text-muted border border-line';

            return (
              <div
                key={item.place.id}
                onClick={() => {
                  onAbrirLugar(item.place);
                  onClose();
                }}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 p-3.5 flex gap-3.5 cursor-pointer ${
                  item.posicao === 1
                    ? 'border-accent/60 bg-gradient-to-r from-accent/10 via-s1 to-s1 hover:border-accent shadow-md'
                    : 'border-line bg-s1 hover:border-[#42392E] hover:bg-s1/90'
                }`}
              >
                {/* Posição / Medalha */}
                <div className="flex flex-col items-center justify-center shrink-0 w-8">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                      item.posicao <= 3
                        ? `bg-gradient-to-br ${medalColor}`
                        : medalColor
                    }`}
                  >
                    {item.posicao === 1 ? '1º' : item.posicao === 2 ? '2º' : item.posicao === 3 ? '3º' : item.posicao}
                  </div>
                </div>

                {/* Foto do Estabelecimento */}
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-s2">
                  {foto ? (
                    <img
                      src={foto}
                      alt={item.place.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-s2">
                      <Utensils size={20} className="text-muted opacity-60" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1 rounded-md bg-black/80 px-1 py-0.5 text-[12px] font-bold text-accent flex items-center gap-0.5">
                    <Star size={9} className="fill-accent text-accent" />
                    <span>{item.notaGeral.toFixed(1).replace('.', ',')}</span>
                  </div>
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-display text-base font-bold text-ink group-hover:text-accent transition truncate">
                        {item.place.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => handleToggleSalvar(e, item.place)}
                        className={`p-1.5 rounded-full transition shrink-0 ${
                          salvo
                            ? 'text-accent'
                            : 'text-muted hover:text-ink hover:bg-s2'
                        }`}
                        title={salvo ? 'Salvo na Wishlist' : 'Salvar na Wishlist'}
                      >
                        <Bookmark
                          size={16}
                          className={salvo ? 'fill-accent' : ''}
                        />
                      </button>
                    </div>

                    <p className="text-[11px] text-muted truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="shrink-0 text-accent/80" />
                      <span>{item.place.address || item.place.cityName}</span>
                    </p>

                    {/* Prato Mais Indicado da Comunidade */}
                    {item.pratoDestaque && (
                      <div className="flex items-center gap-1 text-[11px] text-[#D8CFC1] mt-1 truncate">
                        <Flame size={12} className="text-accent shrink-0 fill-accent" />
                        <span className="text-muted">Prato top:</span>
                        <b className="text-accent truncate">{item.pratoDestaque.nome}</b>
                      </div>
                    )}
                  </div>

                  {/* Detalhes de Critérios */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-line/40 text-[11px] text-muted">
                    <div className="flex items-center gap-2">
                      <span>Comida <strong className="text-ink">{item.medias.comida.toFixed(1)}</strong></span>
                      <span>·</span>
                      <span>Ambiente <strong className="text-ink">{item.medias.ambiente.toFixed(1)}</strong></span>
                    </div>

                    <span className="text-accent font-semibold text-[12px]">
                      {item.totalAvaliacoes} avaliações
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
