// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Crosshair, Bookmark } from 'lucide-react';
import GoogleMapsView, {
  type UnifiedPlace,
  type GoogleMapsViewRef,
} from '../components/map/GoogleMapsView';
import { solicitarLocalizacaoAtual, obterCoordenadasSalvas } from '../services/locationService';
import { calculateDistanceMeters } from '../services/foursquare/distance';
import { buscarProximos, searchPlaces, SAMPLE_PLACES, calcularDistanciaKm } from '../lib/places';
import type { UserProfile, Place } from '../types';

/** Regras de cada filtro do mapa: tipo do lugar e palavras do nome ou da cozinha. */
const REGRAS_CATEGORIA: Record<string, { tipos?: string[]; termos?: RegExp }> = {
  restaurant: { tipos: ['restaurant'] },
  cafe: { tipos: ['cafe'], termos: /caf[eé]|espresso|torra/ },
  bar: { tipos: ['bar'], termos: /\bbar\b|boteco|coquetel|chopp/ },
  pizza: { termos: /pizz|napolet/ },
  burger: { termos: /burger|hamb[uú]rguer/ },
  japonesa: { termos: /japon|sushi|omakase|ramen|izakaya/ },
  padaria: { tipos: ['bakery'], termos: /padaria|confeitaria|p[aã]es|levain/ },
};

function combinaCategoria(p: Place, categoria: string) {
  const regra = REGRAS_CATEGORIA[categoria];
  if (!regra) return true;
  if (regra.tipos?.includes(p.tipo || '')) return true;
  const texto = `${p.name || ''} ${p.cuisine || ''}`.toLowerCase();
  return !!regra.termos?.test(texto);
}

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

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastSalvo, setToastSalvo] = useState(true);

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
        rawPlaces = rawPlaces.filter((p) => combinaCategoria(p, categoria));
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

  const avisar = (msg: string, salvo = false) => {
    setToastSalvo(salvo);
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleRecentralizar = () => {
    const voltarParaCidade = () => {
      mapRef.current?.recenter(coords.lat, coords.lng);
      avisar('Sem acesso à localização. Mostrando a cidade.');
    };
    if (!navigator.geolocation) return voltarParaCidade();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords((c) => ({ ...c, lat, lng }));
        mapRef.current?.recenter(lat, lng);
      },
      voltarParaCidade,
      { timeout: 6000, maximumAge: 60000 }
    );
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-bg">
      {toastMsg && (
        <div
          role="status"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-medium text-bg shadow-lg animate-in slide-in-from-top-2"
        >
          {toastSalvo && <Bookmark size={14} className="fill-current" />}
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
          onSelectPlace={(p) => {
            setSelectedPlace(p);
            if (p) handleVerRestaurante(p);
          }}
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
        className="absolute right-4 bottom-24 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-s1 text-ink shadow-md hover:text-primary cursor-pointer"
      >
        <Crosshair size={19} strokeWidth={1.8} />
      </button>
    </div>
  );
}
