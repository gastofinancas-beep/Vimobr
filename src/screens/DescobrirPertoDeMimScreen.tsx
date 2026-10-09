// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Crosshair, Bookmark } from 'lucide-react';
import StarRating from '../components/StarRating';
import { PlaceImage, btn } from '../components/ui';
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

        // Só dados reais: nada de nota, contagem ou preço inventados
        const vimoRating = p.vimoRating ?? null;
        const vimoReviews = p.vimoReviewsCount ?? 0;

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
          priceLevel: typeof p.priceLevel === 'number' ? '$'.repeat(Math.min(p.priceLevel, 4)) : p.priceLevel || null,
          googleUserRatingCount: p.googleUserRatingCount ?? p.reviewsCount ?? 0,
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

  const sel = selectedPlace;
  const notaSel = sel ? sel.vimoRating ?? sel.rating ?? null : null;
  const qtdSel = sel ? (sel.vimoRating ? sel.vimoReviewsCount : sel.googleUserRatingCount) || 0 : 0;
  const metaSel = sel
    ? [sel.category, sel.priceLevel, sel.distanceFormatted].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="relative h-screen w-full overflow-hidden bg-bg">
      {toastMsg && (
        <div
          role="status"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-medium text-bg shadow-lg animate-in slide-in-from-top-2"
        >
          <Bookmark size={14} className="fill-current" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Mapa em tela cheia */}
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

      {/* Busca e filtros sobre o mapa */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 pt-4 pointer-events-none">
        <div className="mx-auto max-w-md space-y-2 pointer-events-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="flex h-11 items-center gap-2.5 rounded-full bg-s1 px-4 shadow-md ring-1 ring-transparent focus-within:ring-primary transition"
          >
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" />
            <input
              type="search"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                if (!e.target.value) {
                  carregarLugares(coords.lat, coords.lng, categoriaAtiva, '');
                }
              }}
              placeholder="Buscar perto de você"
              aria-label="Buscar lugares no mapa"
              className="flex-1 bg-transparent text-base text-ink placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => {
                  setTermoBusca('');
                  carregarLugares(coords.lat, coords.lng, categoriaAtiva, '');
                }}
                className="-mr-1 p-1 text-muted hover:text-ink cursor-pointer"
                aria-label="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </form>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIAS_FILTRO.map((cat) => {
              const ativo = categoriaAtiva === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  aria-pressed={ativo}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap shadow-sm transition-colors cursor-pointer ${
                    ativo ? 'bg-ink text-bg font-semibold' : 'bg-s1 text-ink-2 hover:text-ink'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Minha localização */}
      <button
        type="button"
        onClick={handleRecentralizar}
        aria-label="Voltar para minha localização"
        className={`absolute right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-s1 text-ink shadow-md transition-[bottom] duration-200 hover:text-primary cursor-pointer ${
          sel ? 'bottom-[15.5rem]' : 'bottom-24'
        }`}
      >
        <Crosshair size={19} strokeWidth={1.8} />
      </button>

      {/* Lugar selecionado: aparece só ao tocar em um pino */}
      {sel && (
        <div className="absolute inset-x-4 bottom-24 z-30 mx-auto max-w-md animate-in slide-in-from-bottom-2">
          <div className="flex gap-3 rounded-2xl bg-s1 p-3 shadow-lg">
            <button
              type="button"
              onClick={() => handleVerRestaurante(sel)}
              aria-label={`Ver ${sel.name}`}
              className="h-[88px] w-[66px] shrink-0 overflow-hidden rounded-md cursor-pointer"
            >
              <PlaceImage src={sel.photoUrl} name={sel.name} className="h-full w-full" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate text-base font-semibold text-ink">{sel.name}</h3>
                <button
                  type="button"
                  onClick={(e) => handleToggleWishlist(e, sel)}
                  aria-pressed={!!wishlistState[sel.id]}
                  aria-label={wishlistState[sel.id] ? 'Remover de Quero ir' : 'Salvar em Quero ir'}
                  className={`-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-s2 cursor-pointer ${
                    wishlistState[sel.id] ? 'text-primary' : 'text-muted'
                  }`}
                >
                  <Bookmark size={18} strokeWidth={1.8} className={wishlistState[sel.id] ? 'fill-current' : ''} />
                </button>
              </div>

              {notaSel !== null ? (
                <div className="flex items-center gap-1.5">
                  <span className="t-rating text-sm text-ink">{notaSel.toFixed(1).replace('.', ',')}</span>
                  <StarRating value={notaSel} size={11} />
                  {qtdSel > 0 && <span className="t-meta tabular">({qtdSel.toLocaleString('pt-BR')})</span>}
                </div>
              ) : (
                <span className="t-meta">Sem avaliações ainda</span>
              )}
              {metaSel && <p className="mt-0.5 truncate t-meta">{metaSel}</p>}

              <button
                type="button"
                onClick={() => handleVerRestaurante(sel)}
                className={`${btn.secondary} mt-auto h-9 self-start px-4`}
              >
                Ver lugar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
