// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Crosshair,
  Bookmark,
  ChevronRight,
  Star,
} from 'lucide-react';
import GoogleMapsView, {
  type UnifiedPlace,
  type GoogleMapsViewRef,
} from '../components/map/GoogleMapsView';
import { solicitarLocalizacaoAtual, obterCoordenadasSalvas } from '../services/locationService';
import { calculateDistanceMeters } from '../services/foursquare/distance';
import { buscarProximos, searchPlaces, SAMPLE_PLACES, calcularDistanciaKm } from '../lib/places';
import { estaNaWishlist, alternarWishlist } from '../lib/wishlist';
import type { UserProfile, Place } from '../types';

const CATEGORIAS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'restaurant', label: 'Restaurantes' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'bar', label: 'Bares' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'burger', label: 'Hambúrguer' },
  { id: 'japonesa', label: 'Japonesa' },
  { id: 'padaria', label: 'Padarias' },
];

export default function DescobrirPertoDeMimScreen({
  onAbrirLugar,
  currentUser,
}: {
  onAbrirLugar?: (p: Place) => void;
  currentUser?: UserProfile;
  onAvaliar?: (p: Place) => void;
} = {}) {
  // 1. Localização do Usuário
  const [coords, setCoords] = useState<{ lat: number; lng: number; displayName?: string }>(() => {
    const salvas = obterCoordenadasSalvas();
    return salvas || { lat: -23.561684, lng: -46.682371, displayName: 'São Paulo - SP' };
  });

  const mapRef = useRef<GoogleMapsViewRef>(null);
  const [lugares, setLugares] = useState<UnifiedPlace[]>([]);
  // IMPORTANTE: NÃO selecionar nenhum restaurante automaticamente ao abrir o mapa!
  const [selectedPlace, setSelectedPlace] = useState<UnifiedPlace | null>(null);

  // Filtros e Busca
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');

  // Wishlist
  const [wishlistState, setWishlistState] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchCacheRef = useRef<Map<string, UnifiedPlace[]>>(new Map());

  // Solicitar localização ao carregar
  useEffect(() => {
    let ativo = true;
    solicitarLocalizacaoAtual()
      .then((loc) => {
        if (ativo && loc) {
          setCoords(loc);
        }
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

  // Carregar quantidade controlada de restaurantes (8 a 12 restaurantes relevantes)
  const carregarLugares = async (lat: number, lng: number, categoria = 'todos', query = '') => {
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${categoria}_${query.trim().toLowerCase()}`;
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setLugares(cached);
      return;
    }

    try {
      let rawPlaces: Place[] = [];

      if (query.trim()) {
        rawPlaces = await searchPlaces(query.trim(), {
          lat,
          lng,
          tipo: categoria !== 'todos' ? categoria : undefined,
        });
      } else {
        rawPlaces = await buscarProximos(lat, lng, 3000);
      }

      if (!rawPlaces || rawPlaces.length === 0) {
        rawPlaces = SAMPLE_PLACES;
      }

      // Filtragem por categoria
      if (categoria !== 'todos') {
        const catLow = categoria.toLowerCase();
        rawPlaces = rawPlaces.filter((p) => {
          const t = ((p.tipo || '') + ' ' + (p.name || '') + ' ' + (p.address || '')).toLowerCase();
          return t.includes(catLow);
        });
      }

      // Normaliza para UnifiedPlace
      const unified: UnifiedPlace[] = rawPlaces.map((p) => {
        const distKm = calcularDistanciaKm(lat, lng, p.lat, p.lng);
        const distFormatted = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;

        const vimoReviews = Math.floor((p.rating || 4.7) * 26);
        const vimoRating = p.rating ? Number(p.rating.toFixed(1)) : 4.8;

        return {
          id: p.id,
          name: p.name,
          category:
            p.tipo === 'cafe'
              ? 'Cafeteria'
              : p.tipo === 'bar'
              ? 'Bar'
              : p.tipo === 'bakery'
              ? 'Padaria'
              : 'Restaurante',
          lat: p.lat,
          lng: p.lng,
          address: p.address,
          rating: p.rating,
          vimoRating,
          vimoReviewsCount: vimoReviews,
          googleRating: p.rating,
          priceLevel: typeof p.priceLevel === 'number' ? '$'.repeat(Math.min(p.priceLevel, 4)) : (p.priceLevel || '$$$'),
          distanceFormatted: distFormatted,
          photoUrl: p.photoUrl,
          rawPlace: p,
        };
      });

      // Ordenar por proximidade e limitar a 10 restaurantes visíveis inicialmente para o mapa respirar
      unified.sort((a, b) => {
        const distA = calculateDistanceMeters(lat, lng, a.lat, a.lng);
        const distB = calculateDistanceMeters(lat, lng, b.lat, b.lng);
        return distA - distB;
      });

      const lugaresSelecionados = unified.slice(0, 12);

      searchCacheRef.current.set(cacheKey, lugaresSelecionados);
      setLugares(lugaresSelecionados);
    } catch (err) {
      console.warn('Erro ao carregar lugares:', err);
    }
  };

  // Carregar inicial e quando categoria mudar
  useEffect(() => {
    carregarLugares(coords.lat, coords.lng, categoriaAtiva, termoBusca);
  }, [coords.lat, coords.lng, categoriaAtiva]);

  // Wishlist
  useEffect(() => {
    const uid = currentUser?.uid || 'user-me';
    const map: Record<string, boolean> = {};
    lugares.forEach((p) => {
      if (estaNaWishlist(uid, p.id)) {
        map[p.id] = true;
      }
    });
    setWishlistState(map);
  }, [lugares, currentUser?.uid]);

  const handleToggleWishlist = async (e: React.MouseEvent, place: UnifiedPlace) => {
    e.stopPropagation();
    const uid = currentUser?.uid || 'user-me';
    const pObj: Place = place.rawPlace || {
      id: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      rating: place.rating || 4.5,
      tipo: place.category,
      photoUrl: place.photoUrl || '',
    };

    const res = await alternarWishlist(uid, pObj);
    setWishlistState((prev) => ({ ...prev, [place.id]: res.added }));
    setToastMsg(res.added ? `${place.name} salvo` : 'Removido');
    setTimeout(() => setToastMsg(null), 1600);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    carregarLugares(coords.lat, coords.lng, categoriaAtiva, termoBusca);
  };

  const handleVerRestaurante = (unified: UnifiedPlace) => {
    if (onAbrirLugar) {
      const p: Place = unified.rawPlace || {
        id: unified.id,
        name: unified.name,
        address: unified.address,
        lat: unified.lat,
        lng: unified.lng,
        rating: unified.rating || 4.5,
        tipo: unified.category,
        photoUrl: unified.photoUrl || '',
      };
      onAbrirLugar(p);
    }
  };

  const handleRecentralizar = () => {
    if (mapRef.current) {
      mapRef.current.recenter(coords.lat, coords.lng);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#EFECE6]">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#171717] px-3 py-1 text-[11px] font-medium text-white shadow-md flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <Bookmark size={11} className="fill-[var(--star)] text-[var(--star)]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. MAPA (100% da área útil com POIs do Google desativados) */}
      <div className="absolute inset-0 z-0">
        <GoogleMapsView
          ref={mapRef}
          userLat={coords.lat}
          userLng={coords.lng}
          places={lugares}
          selectedPlaceId={selectedPlace?.id ?? null}
          onSelectPlace={(p) => setSelectedPlace(p)}
          className="h-full w-full"
        />
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS FLUTUANTES (Superiores) */}
      <div className="absolute top-0 inset-x-0 z-20 pt-3.5 pb-2 px-4 pointer-events-none">
        <div className="max-w-[320px] mx-auto space-y-1.5 pointer-events-auto">
          {/* BARRA DE PESQUISA BRANCA SIMPLES: [ Buscar lugares... ] */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-[#E5E0D6] transition-all focus-within:border-[var(--star)]/50"
          >
            <Search size={14} className="text-gray-400 shrink-0 stroke-[2]" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                if (!e.target.value) {
                  carregarLugares(coords.lat, coords.lng, categoriaAtiva, '');
                }
              }}
              placeholder="Buscar lugares..."
              className="flex-1 bg-transparent text-[12px] text-gray-900 placeholder:text-gray-400 font-normal focus:outline-none"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => {
                  setTermoBusca('');
                  carregarLugares(coords.lat, coords.lng, categoriaAtiva, '');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                aria-label="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </form>

          {/* FILTROS HORIZONTAIS COMPACTOS (~28px de altura) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIAS_FILTRO.map((cat) => {
              const ativo = categoriaAtiva === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`h-7 px-2.5 rounded-full text-[11px] whitespace-nowrap transition-all duration-150 shrink-0 ${
                    ativo
                      ? 'bg-[var(--star)] text-white font-medium shadow-2xs'
                      : 'bg-white text-gray-700 font-normal border border-[#E5E0D6] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:text-gray-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. BOTÃO DE LOCALIZAÇÃO (Discreto, circular e minimalista) */}
      <div
        className={`absolute right-4 z-20 pointer-events-auto transition-all duration-200 ${
          selectedPlace ? 'bottom-32' : 'bottom-18'
        }`}
      >
        <button
          type="button"
          onClick={handleRecentralizar}
          className="w-8 h-8 rounded-full bg-white text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center hover:text-[var(--star)] transition-all active:scale-95"
          title="Minha localização"
          aria-label="Minha localização"
        >
          <Crosshair size={15} strokeWidth={2} />
        </button>
      </div>

      {/* 4. CARD DO RESTAURANTE SELECIONADO (Aparece SOMENTE ao tocar em um restaurante) */}
      {selectedPlace && (
        <div className="absolute bottom-18 inset-x-4 z-30 max-w-[300px] mx-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="relative rounded-xl bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 flex gap-2.5 items-center">
            {/* Foto pequena (~52px) */}
            <div className="w-[52px] h-[52px] rounded-lg overflow-hidden bg-gray-100 shrink-0">
              <img
                src={
                  selectedPlace.photoUrl ||
                  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80'
                }
                alt={selectedPlace.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Informações Simplificadas */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <h3 className="font-semibold text-[12px] text-gray-900 truncate tracking-tight">
                  {selectedPlace.name}
                </h3>

                <div className="flex items-center gap-1 text-[12px] mt-0.5">
                  <span className="font-semibold text-[var(--star)] flex items-center gap-0.5">
                    <Star size={9} className="fill-[var(--star)] text-[var(--star)]" />
                    <span>{selectedPlace.vimoRating ? selectedPlace.vimoRating.toFixed(1) : selectedPlace.rating?.toFixed(1) || '4.8'}</span>
                  </span>
                  <span className="text-gray-300">&bull;</span>
                  <span className="text-gray-400">
                    {selectedPlace.vimoReviewsCount || 130} avaliações
                  </span>
                </div>

                <div className="text-[12px] text-gray-400 font-normal truncate mt-0.5 flex items-center gap-1">
                  <span>{selectedPlace.category}</span>
                  <span>&bull;</span>
                  <span>{selectedPlace.priceLevel || '$$$'}</span>
                  <span>&bull;</span>
                  <span>{selectedPlace.distanceFormatted || '100 m'}</span>
                </div>
              </div>

              {/* Botão Ver restaurante e Favorito */}
              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleVerRestaurante(selectedPlace)}
                  className="text-[11px] font-medium text-[var(--star)] hover:text-[#D97706] flex items-center gap-0.5 transition active:scale-95"
                >
                  <span>Ver restaurante</span>
                  <ChevronRight size={11} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggleWishlist(e, selectedPlace)}
                  className={`p-1 transition active:scale-90 ${
                    wishlistState[selectedPlace.id]
                      ? 'text-[var(--star)]'
                      : 'text-gray-300 hover:text-gray-500'
                  }`}
                  title={wishlistState[selectedPlace.id] ? 'Salvo' : 'Salvar'}
                >
                  <Bookmark
                    size={13}
                    className={wishlistState[selectedPlace.id] ? 'fill-[var(--star)]' : ''}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
