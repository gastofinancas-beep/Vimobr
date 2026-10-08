import type { TrendingPlace } from '../types/placesApi';
import {
  calcularDistanciaMetros,
  formatarDistanciaAmigavel,
  formatarPriceLevel,
  formatarTipoRestaurante,
} from './distance';

interface CacheEntry {
  timestamp: number;
  places: TrendingPlace[];
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache para evitar chamadas redundantes e custos

export interface BuscarLugaresEmAltaResultado {
  places: TrendingPlace[];
  error?: string;
  code?: 'API_KEY_MISSING' | 'BILLING_OR_API_NOT_ENABLED' | 'API_ERROR' | 'ZERO_RESULTS' | 'NETWORK_ERROR';
}

/**
 * Busca estabelecimentos reais gastronômicos próximos à localização informada (raio de até 20 km)
 * via Google Places API Oficial (New API).
 */
export async function buscarLugaresEmAltaPerto(
  userLat: number,
  userLng: number,
  radiusMeters = 20000
): Promise<BuscarLugaresEmAltaResultado> {
  // Arredondamento para 3 casas decimais (~100m) para chave de cache
  const cacheKey = `${userLat.toFixed(3)}_${userLng.toFixed(3)}_${radiusMeters}`;
  const cached = CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { places: cached.places };
  }

  try {
    const res = await fetch('/api/places/nearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: userLat,
        longitude: userLng,
        radius: radiusMeters,
      }),
    });

    if (!res.ok) {
      throw new Error(`Erro na resposta do servidor: status ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      return {
        places: [],
        error: data.message || 'Não foi possível carregar os estabelecimentos da API do Google.',
        code: data.code || 'API_ERROR',
      };
    }

    const rawPlaces = data.places || [];

    if (rawPlaces.length === 0) {
      return {
        places: [],
        code: 'ZERO_RESULTS',
      };
    }

    // Normalização dos dados reais com cálculo de distância e score de relevância "Em alta"
    const placesProcessados: TrendingPlace[] = rawPlaces.map((p: any) => {
      const placeLat = p.location?.latitude || p.location?.lat || userLat;
      const placeLng = p.location?.longitude || p.location?.lng || userLng;
      const distMetros = calcularDistanciaMetros(userLat, userLng, placeLat, placeLng);
      const distKm = distMetros / 1000;

      const rating = Number(p.rating) || 0;
      const userRatingCount = Number(p.userRatingCount) || 0;

      // Lógica de "Em Alta":
      // Combina nota oficial do Google, volume de avaliações reais e proximidade
      const pesoAvaliacoes = Math.log10(Math.max(1, userRatingCount) + 5);
      const decaimentoDistancia = Math.pow(Math.max(1, distKm), 0.22);
      const trendingScore = (rating * (pesoAvaliacoes + 1.2)) / decaimentoDistancia;

      return {
        id: p.id,
        name: p.name || p.displayName?.text || 'Estabelecimento',
        formattedAddress: p.formattedAddress || p.address || '',
        shortAddress: p.shortAddress || p.shortFormattedAddress || p.formattedAddress || '',
        location: {
          lat: placeLat,
          lng: placeLng,
        },
        rating,
        userRatingCount,
        priceLevel: p.priceLevel,
        priceFormatted: formatarPriceLevel(p.priceLevel),
        primaryType: p.primaryType,
        types: p.types || [],
        categoryLabel: formatarTipoRestaurante(p.primaryType, p.types),
        openNow: p.openNow ?? null,
        weekdayDescriptions: p.weekdayDescriptions || [],
        nationalPhoneNumber: p.nationalPhoneNumber,
        websiteUri: p.websiteUri,
        googleMapsUri:
          p.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name || '')}&query_place_id=${p.id}`,
        photoUrl: p.photoUrl || null,
        photoName: p.photoName || null,
        distanceMeters: distMetros,
        distanceFormatted: formatarDistanciaAmigavel(distMetros),
        trendingScore,
      };
    });

    // Ordenação estrita: maiores scores de "Em alta" primeiro
    placesProcessados.sort((a, b) => b.trendingScore - a.trendingScore);

    // Salvar no cache em memória
    CACHE.set(cacheKey, {
      timestamp: Date.now(),
      places: placesProcessados,
    });

    return {
      places: placesProcessados,
    };
  } catch (err: any) {
    return {
      places: [],
      error: err.message || 'Erro de conexão com o serviço de lugares.',
      code: 'NETWORK_ERROR',
    };
  }
}
