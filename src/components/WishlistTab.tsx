import { useState } from 'react';
import { Bookmark, Star, MapPin, Trash2, Plus, Edit2, Check, Sparkles, Filter, ArrowUpDown } from 'lucide-react';
import StarRating from './StarRating';
import PlacePlaceholder from './PlacePlaceholder';
import type { WishlistItem } from '../types';
import { photoUrl } from '../lib/places';

export default function WishlistTab({
  items,
  isMeuPerfil,
  onRemover,
  onAtualizarNota,
  onAbrirLugar,
  onAvaliarLugar,
  onExplorar,
}: {
  items: WishlistItem[];
  isMeuPerfil: boolean;
  onRemover: (placeId: string) => void;
  onAtualizarNota?: (placeId: string, nota: string) => void;
  onAbrirLugar: (placeId: string) => void;
  onAvaliarLugar?: (item: WishlistItem) => void;
  onExplorar?: () => void;
}) {
  const [categoria, setCategoria] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'recente' | 'nota'>('recente');
  const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
  const [notaTemp, setNotaTemp] = useState('');

  const categorias = [
    { id: 'todos', label: 'Todos' },
    { id: 'restaurant', label: 'Restaurantes' },
    { id: 'cafe', label: 'Cafés' },
    { id: 'bakery', label: 'Padarias' },
    { id: 'bar', label: 'Bares' },
  ];

  // Filtragem
  const filtrados = items.filter((item) => {
    if (categoria === 'todos') return true;
    return (item.tipo || '').toLowerCase().includes(categoria);
  });

  // Ordenação
  const ordenados = [...filtrados].sort((a, b) => {
    if (ordenacao === 'nota') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  const iniciarEdicaoNota = (item: WishlistItem) => {
    setEditandoNotaId(item.placeId);
    setNotaTemp(item.notes || '');
  };

  const salvarNota = (placeId: string) => {
    onAtualizarNota?.(placeId, notaTemp);
    setEditandoNotaId(null);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Header explicativo da Lista de Desejos */}
      <div className="rounded-3xl border border-line bg-s1 p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-accent/20 text-accent">
              <Bookmark size={16} className="fill-accent" />
            </span>
            <h3 className="font-display text-base font-bold text-ink">Lista de Desejos</h3>
          </div>
          <p className="text-xs text-muted">
            Lugares que você planeja e sonha em conhecer futuramente
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-2xl font-bold text-accent">
            {items.length}
          </span>
          <span className="text-[11px] text-muted block -mt-1">
            {items.length === 1 ? 'lugar' : 'lugares'}
          </span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          {/* Filtro por Categoria */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                className={`h-8 rounded-full px-3 text-xs font-semibold shrink-0 transition ${
                  categoria === c.id
                    ? 'bg-accent text-bg shadow'
                    : 'border border-line bg-s1 text-muted hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1 text-xs self-end sm:self-auto">
            <span className="text-muted flex items-center gap-1">
              <ArrowUpDown size={12} /> Ordenar:
            </span>
            <button
              onClick={() => setOrdenacao(ordenacao === 'recente' ? 'nota' : 'recente')}
              className="text-xs text-accent font-semibold hover:underline"
            >
              {ordenacao === 'recente' ? 'Mais recentes' : 'Melhores notas'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Lugares Salvos */}
      {ordenados.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--s1)] my-4">
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            <img
              src={items.length === 0 ? '/mascote/explorando.png' : '/mascote/pensativo.png'}
              alt="" aria-hidden="true" width={100} height={100} className="object-contain drop-shadow-lg"
            />
            <h3 className="mt-2 text-[15px] font-semibold text-[var(--ink)]">
              {items.length === 0 ? 'Sua Lista de Desejos está vazia' : 'Nenhum lugar nesta categoria'}
            </h3>
            <p className="max-w-[260px] text-[13px] leading-relaxed text-[var(--muted)]">
              {items.length === 0
                ? 'Explore o feed ou o mapa e salve os lugares que você quer conhecer!'
                : 'Tente selecionar outra categoria.'}
            </p>
            {items.length === 0 && onExplorar && (
              <button
                onClick={onExplorar}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-[13px] font-semibold text-[var(--on-primary)] transition active:scale-[0.97]"
              >
                Explorar lugares
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {ordenados.map((item) => {
            const foto = item.placePhotoUrl || photoUrl(item.placePhotoName, 400);
            const isEditando = editandoNotaId === item.placeId;

            return (
              <article
                key={item.placeId}
                className="overflow-hidden rounded-3xl border border-line bg-s1 shadow-md transition hover:border-[#3D352B] flex flex-col"
              >
                <div className="p-3.5 flex gap-3.5">
                  {/* Foto ou Prato Placeholder */}
                  <button
                    type="button"
                    onClick={() => onAbrirLugar(item.placeId)}
                    className="relative w-24 h-28 shrink-0 overflow-hidden rounded-2xl border border-line bg-bg group text-left"
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt={item.placeName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <PlacePlaceholder name={item.placeName} className="h-full w-full" />
                    )}
                    <div className="absolute top-1.5 left-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[12px] font-bold text-accent flex items-center gap-0.5">
                      <Star size={10} className="fill-accent text-accent" />
                      <span>{item.rating ? item.rating.toFixed(1).replace('.', ',') : '–'}</span>
                    </div>
                  </button>

                  {/* Informações */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onAbrirLugar(item.placeId)}
                          className="font-display text-base font-bold text-ink hover:text-accent transition truncate block text-left"
                        >
                          {item.placeName}
                        </button>

                        {isMeuPerfil && (
                          <button
                            type="button"
                            onClick={() => onRemover(item.placeId)}
                            className="p-1 rounded-full text-muted hover:text-red-400 hover:bg-s2 transition shrink-0"
                            title="Remover da Lista de Desejos"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                        <span className="capitalize text-accent font-medium">
                          {item.tipo === 'cafe'
                            ? 'Café'
                            : item.tipo === 'bakery'
                            ? 'Padaria'
                            : item.tipo === 'bar'
                            ? 'Bar'
                            : 'Restaurante'}
                        </span>
                        {item.priceLevel && (
                          <span>
                            · {item.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? '$$$$' : item.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? '$' : '$$$'}
                          </span>
                        )}
                      </div>

                      <p className="flex items-center gap-1 text-xs text-muted truncate mt-1">
                        <MapPin size={12} className="shrink-0 text-accent/80" />
                        <span className="truncate">{item.placeAddress}</span>
                      </p>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[12px] text-muted">
                        Salvo em {new Date(item.addedAt).toLocaleDateString('pt-BR')}
                      </span>

                      {isMeuPerfil && onAvaliarLugar && (
                        <button
                          type="button"
                          onClick={() => onAvaliarLugar(item)}
                          className="flex items-center gap-1 rounded-full bg-accent/15 border border-accent/40 px-3 py-1 text-xs font-bold text-accent hover:bg-accent hover:text-bg transition active:scale-95"
                        >
                          <Plus size={13} className="stroke-[3]" />
                          <span>Já fui / Avaliar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nota Pessoal na Wishlist (ex: "Quero pedir o café coado e o croissant") */}
                <div className="px-3.5 pb-3 pt-1 border-t border-line/40 bg-s2/40">
                  {isEditando ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        autoFocus
                        value={notaTemp}
                        onChange={(e) => setNotaTemp(e.target.value)}
                        placeholder="O que você quer pedir ou experimentar lá?"
                        className="h-8 flex-1 rounded-xl border border-line bg-bg px-3 text-xs text-ink focus:border-accent focus:outline-none"
                      />
                      <button
                        onClick={() => salvarNota(item.placeId)}
                        className="h-8 px-3 rounded-xl bg-accent text-bg text-xs font-bold flex items-center gap-1"
                      >
                        <Check size={14} /> Salvar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-accent text-[11px] font-bold shrink-0">Desejo:</span>
                        <span className="text-[#C8BFA8] italic truncate text-[11px]">
                          {item.notes ? `“${item.notes}”` : 'Nenhuma anotação (toque para adicionar)'}
                        </span>
                      </div>
                      {isMeuPerfil && (
                        <button
                          onClick={() => iniciarEdicaoNota(item)}
                          className="p-1 text-muted hover:text-accent transition shrink-0 ml-2"
                          title="Editar anotação"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
