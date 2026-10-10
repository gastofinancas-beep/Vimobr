import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Star,
  MapPin,
  Utensils,
  Coffee,
  Wine,
  Croissant,
  ArrowUpRight,
  Loader2,
  Users,
} from 'lucide-react';
import { searchPlaces, SAMPLE_PLACES } from '../lib/places';
import MascotMessage from './MascotMessage';
import { Spinner } from './ui';
import { useEscape } from '../hooks/useEscape';
import { SUGGESTED_FRIENDS } from '../screens/ComunidadeScreen';
import type { Place } from '../types';

const CATEGORIAS_BUSCA = [
  { id: 'todos', label: 'Todos', icon: Utensils, tipo: undefined },
  { id: 'restaurant', label: 'Restaurantes', icon: Utensils, tipo: 'restaurant' },
  { id: 'cafe', label: 'Cafés', icon: Coffee, tipo: 'cafe' },
  { id: 'bar', label: 'Bares & Drinks', icon: Wine, tipo: 'bar' },
  { id: 'bakery', label: 'Padarias', icon: Croissant, tipo: 'bakery' },
] as const;

const SUGESTOES_POPULARES = [
  'Cafés Especiais',
  'Pizzaria Napolitana',
  'Bar de Coquetelaria',
  'Sushi & Izakaya',
  'Padaria Artesanal',
  'Hambúrguer Gourmet',
];

export default function SearchModal({
  onClose,
  onAbrirLugar,
  onAbrirPerfil,
}: {
  onClose: () => void;
  onAbrirLugar: (p: Place | string) => void;
  onAbrirPerfil: (uid: string) => void;
}) {
  useEscape(onClose);
  const [query, setQuery] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [lugares, setLugares] = useState<Place[]>(SAMPLE_PLACES);
  const [carregando, setCarregando] = useState(false);
  const [abaPrincipal, setAbaPrincipal] = useState<'lugares' | 'pessoas'>('lugares');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tipoSelecionado = CATEGORIAS_BUSCA.find((c) => c.id === categoriaAtiva)?.tipo;

  const executarBusca = async (texto: string, tipo?: string) => {
    if (texto.trim().length > 1) {
      setCarregando(true);
      try {
        const res = await searchPlaces(texto, { tipo });
        setLugares(res);
      } catch (err) {
        console.warn('Erro ao pesquisar lugares no Google Places:', err);
      } finally {
        setCarregando(false);
      }
    } else {
      setCarregando(false);
      if (tipo) {
        setLugares(SAMPLE_PLACES.filter((p) => p.tipo === tipo));
      } else {
        setLugares(SAMPLE_PLACES);
      }
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      executarBusca(val, tipoSelecionado);
    }, 350);
  };

  const handleSelecionarCategoria = (catId: string) => {
    setCategoriaAtiva(catId);
    const tipo = CATEGORIAS_BUSCA.find((c) => c.id === catId)?.tipo;
    executarBusca(query, tipo);
  };

  const amigosFiltrados = (SUGGESTED_FRIENDS as any[]).filter(
    (f: any) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.handle.toLowerCase().includes(query.toLowerCase()) ||
      f.city.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 sm:pt-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-bg shadow-2xl flex flex-col overflow-hidden max-h-[88vh] animate-in slide-in-from-top-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de Busca */}
        <div className="bg-[var(--s1)] text-[var(--ink)] p-4 border-b border-[var(--line)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-2">
                Buscar no Vimo
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar busca"
              className="w-11 h-11 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Campo de Input */}
          <div className="relative flex items-center bg-[var(--s2)] rounded-xl px-3.5 min-h-12 border border-[var(--line)] focus-within:border-[var(--primary)] transition">
            {carregando ? (
              <Loader2 size={18} className="text-[var(--primary)] animate-spin mr-2.5 shrink-0" />
            ) : (
              <Search size={18} className="text-[var(--muted)] mr-2.5 shrink-0" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar lugares, culinária ou amigos..."
              aria-label="Buscar"
              className="w-full bg-transparent text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none font-normal"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                aria-label="Limpar campo"
                className="w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center text-xs cursor-pointer ml-1 shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Abas Principais com sublinhado */}
        <div className="px-4 flex border-b border-[var(--line)] bg-[var(--s1)]">
          <button
            type="button"
            onClick={() => setAbaPrincipal('lugares')}
            className={`flex-1 min-h-11 pb-2 text-[14px] text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              abaPrincipal === 'lugares'
                ? 'text-[var(--ink)] font-medium border-b-2 border-[var(--primary)] -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--ink)] font-normal'
            }`}
          >
            <Utensils size={14} />
            <span>Lugares</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaPrincipal('pessoas')}
            className={`flex-1 min-h-11 pb-2 text-[14px] text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              abaPrincipal === 'pessoas'
                ? 'text-[var(--ink)] font-medium border-b-2 border-[var(--primary)] -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--ink)] font-normal'
            }`}
          >
            <Users size={14} />
            <span>Pessoas</span>
          </button>
        </div>

        {/* Filtros de Categoria (apenas para Lugares) */}
        {abaPrincipal === 'lugares' && (
          <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--s1)]/50">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {CATEGORIAS_BUSCA.map((cat) => {
                const isSelected = categoriaAtiva === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelecionarCategoria(cat.id)}
                    className={`inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl text-[13px] font-medium shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sugestões Populares quando a busca está vazia */}
            {!query && (
              <div className="pt-2">
                <p className="text-sm font-medium text-ink-2 mb-1.5">
                  Termos em Alta
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {SUGESTOES_POPULARES.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => handleQueryChange(sugestao)}
                      className="min-h-9 px-3 rounded-xl bg-[var(--s1)] text-sm font-medium text-ink-2 border border-[var(--line)] hover:text-[var(--primary)] transition shrink-0 cursor-pointer"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {abaPrincipal === 'lugares' ? (
            carregando && lugares.length === 0 ? (
              <Spinner label="Buscando lugares" />
            ) : lugares.length === 0 ? (
              <MascotMessage
                reaction="confuso"
                title="Nenhum lugar encontrado"
                subtitle="Tente outro nome, culinária ou bairro."
              />
            ) : (
              lugares.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onAbrirLugar(p);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-s1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-14 rounded-lg bg-[var(--s2)] overflow-hidden shrink-0 border border-[var(--line)]">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
                          <Utensils size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[14px] font-medium text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition">
                          {p.name}
                        </h4>
                        {p.tipo && (
                          <span className="text-[12px] px-1.5 py-0.5 rounded bg-[var(--s2)] text-[var(--muted)] capitalize shrink-0">
                            {p.tipo === 'cafe' ? 'Café' : p.tipo === 'bakery' ? 'Padaria' : p.tipo === 'bar' ? 'Bar' : 'Restaurante'}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--muted)] truncate mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="shrink-0 text-[var(--star)]" />
                        <span className="truncate">{p.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pl-3 flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[13px] font-medium text-[var(--star)] flex items-center justify-end gap-0.5">
                        <Star size={12} className="fill-[var(--star)]" />
                        {p.rating ? p.rating.toFixed(1) : (p.googleRating ? p.googleRating.toFixed(1) : '–')}
                      </span>
                    </div>
                    <ArrowUpRight size={15} className="text-[var(--muted)] group-hover:text-[var(--primary)] transition" />
                  </div>
                </button>
              ))
            )
          ) : (
            amigosFiltrados.length === 0 ? (
              <MascotMessage
                reaction="social"
                title="Nenhum usuário encontrado"
                subtitle={`Ninguém encontrado para "${query}".`}
              />
            ) : (
              amigosFiltrados.map((f: any) => (
                <button
                  key={f.uid}
                  type="button"
                  onClick={() => {
                    onAbrirPerfil(f.uid);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-s1 text-left transition-colors group cursor-pointer"
                >
                  <img
                    src={f.photo}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border border-[var(--line)]"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-medium text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition">
                      {f.name}
                    </h4>
                    <p className="text-[12px] text-[var(--muted)] truncate">
                      {f.handle} &bull; {f.city}
                    </p>
                  </div>
                  <ArrowUpRight size={15} className="text-[var(--muted)] group-hover:text-[var(--primary)] transition" />
                </button>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
