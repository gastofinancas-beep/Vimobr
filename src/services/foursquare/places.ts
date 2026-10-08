import type { FsqNormalizedPlace, FsqRawPlace, FsqTip, MapViewportBounds, SearchPlacesOptions } from '../../types/foursquare';
import { calculateDistanceMeters, formatFriendlyDistance, formatFsqPrice } from './distance';
import { getCachedPlaces, setCachedPlaces, getCachedPlaceDetail, setCachedPlaceDetail } from './cache';

export interface FsqSearchResult {
  places: FsqNormalizedPlace[];
  error?: string;
  code?: 'API_KEY_MISSING' | 'API_ERROR' | 'ZERO_RESULTS' | 'NETWORK_ERROR';
}

export interface SearchNearbyParams {
  radiusMeters?: number;
  bounds?: MapViewportBounds;
  query?: string;
}

/**
 * Normaliza um lugar bruto retornado pela Foursquare Places API
 */
export function normalizeFsqPlace(raw: FsqRawPlace, userLat: number, userLng: number): FsqNormalizedPlace | null {
  const lat = raw.geocodes?.main?.latitude ?? userLat;
  const lng = raw.geocodes?.main?.longitude ?? userLng;

  // Calcula a distância geodésica precisa a partir da localização do usuário
  const distanceMeters = calculateDistanceMeters(userLat, userLng, lat, lng);

  // Fotos reais (Foursquare ou OpenStreetMap)
  const photos = (raw.photos || []).map((p) => {
    return `${p.prefix}800x600${p.suffix}`;
  });

  // Categorias
  const primaryCat = raw.categories?.[0]?.name || 'Gastronomia';
  const allCategories = (raw.categories || []).map((c) => c.name);

  // Endereço
  const address = raw.location?.formatted_address || raw.location?.address || '';
  const shortAddress = raw.location?.neighborhood?.[0] || raw.location?.locality || address;

  // Avaliação: Foursquare usa escala de 0 a 10. Normalizamos para 5 estrelas sem inventar dados
  const rawRating10 = typeof raw.rating === 'number' ? raw.rating : null;
  const rating5 = rawRating10 !== null ? Math.round((rawRating10 / 2) * 10) / 10 : null;
  const ratingsCount = raw.stats?.total_ratings ?? null;

  // Preço
  const priceLevel = formatFsqPrice(raw.price);

  // Lógica de "Em Alta" (Relevância baseada nos dados reais fornecidos pela Foursquare)
  const baseRating = rating5 ?? 3.5;
  const count = ratingsCount ?? 0;
  const popularity = raw.popularity ?? 0.5;
  const distKm = distanceMeters / 1000;
  const trendingScore =
    (baseRating * (Math.log10(count + 5) + 1) * (1 + popularity * 0.4)) / Math.pow(Math.max(1, distKm), 0.22);

  // Link para navegação no Google Maps (apenas link externo para abrir aplicativo/web)
  const queryMaps = encodeURIComponent(`${raw.name} ${address}`.trim());
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${queryMaps}`;

  return {
    id: raw.fsq_id,
    name: raw.name,
    category: primaryCat,
    categories: allCategories,
    lat,
    lng,
    distanceMeters,
    distanceFormatted: formatFriendlyDistance(distanceMeters),
    address,
    shortAddress,
    rating5,
    rawRating10,
    ratingsCount,
    priceLevel,
    priceNumber: raw.price ?? null,
    openNow: raw.hours?.open_now ?? null,
    hoursDisplay: raw.hours?.display ?? null,
    photos,
    primaryPhoto: photos[0] || null,
    description: raw.description ?? null,
    phone: raw.tel ?? null,
    website: raw.website ?? null,
    googleMapsUrl,
    trendingScore,
  };
}

/**
 * Busca estabelecimentos reais próximos usando Foursquare Places API.
 * Suporta busca pela extensão visível do mapa (bounds ne/sw) ou raio flexível sem corte de 20 km.
 */
export async function searchNearbyRestaurants(
  userLat: number,
  userLng: number,
  optionsOrRadius?: number | SearchNearbyParams,
  legacyQuery?: string
): Promise<FsqSearchResult> {
  const options: SearchNearbyParams =
    typeof optionsOrRadius === 'number'
      ? { radiusMeters: optionsOrRadius, query: legacyQuery }
      : optionsOrRadius || {};

  const { radiusMeters, bounds, query } = options;

  // Chave de cache precisa para viewport ou coordenadas
  const cacheKey = bounds
    ? `bounds_${bounds.ne.lat.toFixed(4)}_${bounds.ne.lng.toFixed(4)}_${bounds.sw.lat.toFixed(4)}_${bounds.sw.lng.toFixed(4)}_${query || ''}`
    : `coords_${userLat.toFixed(4)}_${userLng.toFixed(4)}_${radiusMeters || 12000}_${query || ''}`;

  const cached = getCachedPlaces(cacheKey);
  if (cached) {
    return { places: cached };
  }

  try {
    const res = await fetch('/api/foursquare/places/nearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: userLat,
        longitude: userLng,
        radius: radiusMeters,
        bounds,
        query,
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha na resposta HTTP do servidor: ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      return {
        places: [],
        error: data.message || 'Erro ao carregar dados da Foursquare Places API.',
        code: data.code || 'API_ERROR',
      };
    }

    const rawPlaces: FsqRawPlace[] = data.places || [];

    if (rawPlaces.length === 0) {
      return {
        places: [],
        code: 'ZERO_RESULTS',
      };
    }

    // Normaliza e filtra apenas <= 20 km
    const normalized: FsqNormalizedPlace[] = [];
    for (const raw of rawPlaces) {
      const p = normalizeFsqPlace(raw, userLat, userLng);
      if (p) {
        normalized.push(p);
      }
    }

    if (normalized.length === 0) {
      return {
        places: [],
        code: 'ZERO_RESULTS',
      };
    }

    // Ordenação de relevância ("Em Alta"): Maiores scores primeiro
    normalized.sort((a, b) => b.trendingScore - a.trendingScore);

    // Salva no cache
    setCachedPlaces(cacheKey, normalized);

    return {
      places: normalized,
    };
  } catch (err: any) {
    return {
      places: [],
      error: err.message || 'Erro de rede ao consultar estabelecimentos.',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Obtém detalhes completos de um estabelecimento real na Foursquare
 */
export async function getPlaceDetails(fsq_id: string, userLat?: number, userLng?: number): Promise<FsqNormalizedPlace | null> {
  const cached = getCachedPlaceDetail(fsq_id);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/foursquare/places/${fsq_id}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.place) return null;

    const normalized = normalizeFsqPlace(data.place, userLat ?? 0, userLng ?? 0);
    if (normalized) {
      setCachedPlaceDetail(fsq_id, normalized);
    }
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Obtém dicas/avaliações reais deixadas por usuários na Foursquare
 */
export async function getPlaceTips(fsq_id: string): Promise<FsqTip[]> {
  try {
    const res = await fetch(`/api/foursquare/places/${fsq_id}/tips`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tips || [];
  } catch {
    return [];
  }
}

/**
 * Geocodificação livre e aberta usando OpenStreetMap Nominatim
 */
export async function geocodeWithOpenStreetMap(
  address: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const query = encodeURIComponent(address.trim());
    const res = await fetch(`/api/foursquare/geocode?query=${query}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.location) return null;
    return {
      lat: data.location.lat,
      lng: data.location.lng,
      displayName: data.displayName || address,
    };
  } catch {
    return null;
  }
}
