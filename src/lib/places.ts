import type { Place } from '../types';
import { db } from './firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

// Google Places é pago por chamada. Decisão do produto: nenhuma API paga, então a chave
// fica desligada mesmo que exista no .env, e as buscas usam OpenStreetMap e dados locais.
const getApiKey = (): string => '';

const BASE = 'https://places.googleapis.com/v1';
const TIPOS = ['restaurant', 'cafe', 'bakery', 'bar'];

const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'location', 'photos',
  'priceLevel', 'addressComponents', 'rating', 'userRatingCount',
].map((f) => `places.${f}`).join(',');

export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function extrairBairro(address: string): string {
  if (!address) return 'Centro';
  const parts = address.split('-');
  if (parts.length >= 2) {
    const possivelBairro = parts[1].split(',')[0].trim();
    if (possivelBairro && !possivelBairro.includes('São Paulo') && !possivelBairro.includes('SP')) {
      return possivelBairro;
    }
  }
  if (address.includes('Pinheiros')) return 'Pinheiros';
  if (address.includes('Jardins') || address.includes('Cerqueira')) return 'Jardins';
  if (address.includes('Vila Madalena')) return 'Vila Madalena';
  if (address.includes('Bela Vista')) return 'Bela Vista';
  if (address.includes('Lapa')) return 'Lapa';
  if (address.includes('Itaim')) return 'Itaim Bibi';
  if (address.includes('Moema')) return 'Moema';
  return 'Centro';
}

export function formatarPrecoLabel(priceLevel?: string): string {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE':
    case '$':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
    case '$$':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
    case '$$$':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
    case '$$$$':
      return '$$$$';
    default:
      return '$$';
  }
}

// Extrai a cidade (município + UF) do endereço estruturado do Google
export function cidadeDoLugar(components: any[] = []) {
  const cidade = components.find((c) => c.types?.includes('administrative_area_level_2'))
    ?? components.find((c) => c.types?.includes('locality'));
  const uf = components.find((c) => c.types?.includes('administrative_area_level_1'));
  const cityName = cidade ? `${cidade.longText}${uf ? ' - ' + uf.shortText : ''}` : '';
  return { cityName, cityKey: cityName ? slug(cityName) : '' };
}

// Retorna fotos gastronômicas de alta resolução combinando exatamente com o tipo e culinária do estabelecimento
export function obterFotoTematica(nome = '', tipo = 'restaurant', cuisine = ''): string {
  const n = (nome + ' ' + cuisine).toLowerCase();

  if (n.includes('pizza') || n.includes('forno') || n.includes('napolitan')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('burger') || n.includes('hamburguer') || n.includes('lanche')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('sushi') || n.includes('japones') || n.includes('temaki') || n.includes('ramen') || n.includes('asian')) {
    return 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('café') || n.includes('cafe') || n.includes('coffee') || n.includes('espresso') || tipo === 'cafe') {
    return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('pão') || n.includes('pao') || n.includes('padaria') || n.includes('panific') || n.includes('croissant') || tipo === 'bakery') {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('bar') || n.includes('pub') || n.includes('chope') || n.includes('chopp') || n.includes('cervej') || n.includes('coquetel') || tipo === 'bar') {
    return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('churras') || n.includes('carne') || n.includes('steak') || n.includes('parrilla') || n.includes('espeto')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('pasta') || n.includes('massa') || n.includes('italian') || n.includes('trattoria') || n.includes('cantina')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('sorvete') || n.includes('gelato') || n.includes('açaí') || n.includes('acai')) {
    return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('peixe') || n.includes('frutos do mar') || n.includes('camar') || n.includes('seafood')) {
    return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('doce') || n.includes('confeit') || n.includes('bolo') || n.includes('torta') || n.includes('doceria')) {
    return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';
}

const mapPlace = (p: any): Place => {
  const photoName = p.photos?.[0]?.name;
  const key = getApiKey();
  const googlePhoto = photoName && key
    ? `${BASE}/${photoName}/media?maxWidthPx=1000&key=${key}`
    : undefined;

  const nome = p.displayName?.text ?? 'Restaurante';
  const tipo = p.primaryType?.includes('cafe')
    ? 'cafe'
    : p.primaryType?.includes('bakery')
    ? 'bakery'
    : p.primaryType?.includes('bar')
    ? 'bar'
    : 'restaurant';

  const photoUrlFinal = googlePhoto || obterFotoTematica(nome, tipo);
  const gRating = p.rating ?? 4.6;
  const gCount = p.userRatingCount ?? 180;

  return {
    id: p.id,
    name: nome,
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? -23.55052,
    lng: p.location?.longitude ?? -46.633308,
    photoName,
    photoUrl: photoUrlFinal,
    priceLevel: p.priceLevel,
    rating: gRating,
    googleRating: gRating,
    googleUserRatingCount: gCount,
    reviewsCount: gCount,
    tipo,
    sums: { ambiente: 125, comida: 135, atendimento: 120, custoBeneficio: 118 },
    ...cidadeDoLugar(p.addressComponents),
  };
};

// Fallback places for São Paulo / Demo when API key is not present or offline
export const SAMPLE_PLACES: Place[] = [
  {
    id: 'chIJf-place-01',
    name: 'Maniçoba Bistrô & Café',
    address: 'Rua dos Pinheiros, 452 - Pinheiros, São Paulo - SP',
    lat: -23.561684,
    lng: -46.682371,
    photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_MODERATE',
    rating: 4.8,
    googleRating: 4.8,
    googleUserRatingCount: 2340,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 2340,
    tipo: 'restaurant',
    sums: { ambiente: 182, comida: 186, atendimento: 175, custoBeneficio: 171 },
  },
  {
    id: 'chIJf-place-02',
    name: 'Padaria Artesanal Farinha & Flor',
    address: 'Alameda Lorena, 1290 - Jardins, São Paulo - SP',
    lat: -23.566212,
    lng: -46.667823,
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    rating: 4.9,
    googleRating: 4.9,
    googleUserRatingCount: 1890,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 1890,
    tipo: 'bakery',
    sums: { ambiente: 307, comida: 318, atendimento: 310, custoBeneficio: 300 },
  },
  {
    id: 'chIJf-place-03',
    name: 'Torra Especial & Espresso Bar',
    address: 'Rua Fradique Coutinho, 780 - Vila Madalena, São Paulo - SP',
    lat: -23.557431,
    lng: -46.689542,
    photoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_MODERATE',
    rating: 4.7,
    googleRating: 4.7,
    googleUserRatingCount: 940,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 940,
    tipo: 'cafe',
    sums: { ambiente: 201, comida: 198, atendimento: 192, custoBeneficio: 188 },
  },
  {
    id: 'chIJf-place-04',
    name: 'Bar do Canto & Coquetelaria',
    address: 'Rua Mourato Coelho, 1022 - Vila Madalena, São Paulo - SP',
    lat: -23.555891,
    lng: -46.691456,
    photoUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    rating: 4.6,
    googleRating: 4.6,
    googleUserRatingCount: 1120,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 1120,
    tipo: 'bar',
    sums: { ambiente: 139, comida: 131, atendimento: 133, custoBeneficio: 122 },
  },
  {
    id: 'chIJf-place-05',
    name: 'Trattoria del Nonno',
    address: 'Rua Avanhandava, 81 - Bela Vista, São Paulo - SP',
    lat: -23.549210,
    lng: -46.647180,
    photoUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    rating: 4.8,
    googleRating: 4.8,
    googleUserRatingCount: 3450,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 3450,
    tipo: 'restaurant',
    sums: { ambiente: 245, comida: 250, atendimento: 242, custoBeneficio: 230 },
  },
  {
    id: 'chIJf-place-06',
    name: 'Confeitaria Dourada',
    address: 'Rua Oscar Freire, 320 - Cerqueira César, São Paulo - SP',
    lat: -23.562910,
    lng: -46.669810,
    photoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    rating: 4.5,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 23,
    tipo: 'bakery',
    sums: { ambiente: 108, comida: 104, atendimento: 101, custoBeneficio: 92 },
  },
  {
    id: 'chIJf-place-07',
    name: 'Boteco da Lapa',
    address: 'Rua Guaicurus, 142 - Lapa, São Paulo - SP',
    lat: -23.525100,
    lng: -46.698200,
    photoUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    rating: 4.4,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 35,
    tipo: 'bar',
    sums: { ambiente: 140, comida: 165, atendimento: 154, custoBeneficio: 168 },
  },
  {
    id: 'chIJf-place-08',
    name: 'Forno & Napoletana Pizza Bar',
    address: 'Rua Simão Álvares, 480 - Pinheiros, São Paulo - SP',
    lat: -23.559200,
    lng: -46.690400,
    photoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_MODERATE',
    rating: 4.9,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 78,
    tipo: 'restaurant',
    sums: { ambiente: 380, comida: 392, atendimento: 375, custoBeneficio: 370 },
  },
  {
    id: 'chIJf-place-09',
    name: 'Omakase Shima Sushi Bar',
    address: 'Rua Thomaz Gonzaga, 88 - Liberdade, São Paulo - SP',
    lat: -23.558100,
    lng: -46.634200,
    photoUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    rating: 4.9,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 54,
    tipo: 'restaurant',
    sums: { ambiente: 265, comida: 270, atendimento: 264, custoBeneficio: 240 },
  },
  {
    id: 'chIJf-place-10',
    name: 'Parrilla & Fogo Central',
    address: 'Rua Cunha Gago, 312 - Pinheiros, São Paulo - SP',
    lat: -23.568400,
    lng: -46.696100,
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    rating: 4.8,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 46,
    tipo: 'restaurant',
    sums: { ambiente: 220, comida: 232, atendimento: 218, custoBeneficio: 210 },
  },
  {
    id: 'chIJf-place-11',
    name: 'Burger Craft & Brioche',
    address: 'Rua dos Pinheiros, 700 - Pinheiros, São Paulo - SP',
    lat: -23.564500,
    lng: -46.685200,
    photoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    rating: 4.7,
    cityName: 'São Paulo - SP',
    cityKey: 'sao-paulo-sp',
    reviewsCount: 62,
    tipo: 'restaurant',
    sums: { ambiente: 280, comida: 300, atendimento: 275, custoBeneficio: 295 },
  },
];

async function post(path: string, body: any, fields: string, timeoutMs = 4500) {
  const key = getApiKey();
  if (!key) {
    throw new Error('Chave do Google Places não configurada');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fields,
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Places HTTP ${res.status}: ${errText || 'Falha ao consultar'}`);
    }
    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout de ${timeoutMs}ms excedido na requisição do Google Places.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Gera estabelecimentos locais ao redor do GPS do usuário caso não haja chave da API configurada

// Busca por texto (tela Buscar e escolha do lugar ao avaliar)
export async function searchPlaces(
  query: string,
  opts?: { lat?: number; lng?: number; tipo?: string }
): Promise<Place[]> {
  const key = getApiKey();
  if (key) {
    try {
      const body: any = { textQuery: query, languageCode: 'pt-BR', regionCode: 'BR', maxResultCount: 15 };
      if (opts?.tipo) body.includedType = opts.tipo;
      if (opts?.lat && opts?.lng) {
        body.locationBias = { circle: { center: { latitude: opts.lat, longitude: opts.lng }, radius: 5000 } };
      }
      const data = await post('places:searchText', body, FIELDS);
      const apiPlaces = (data.places ?? []).map(mapPlace);
      if (apiPlaces.length > 0) return apiPlaces;
    } catch (err) {
      console.warn('Fallback searchPlaces Google API:', err);
    }
  }

  // Busca real online via Nominatim OpenStreetMap
  try {
    const latParam = opts?.lat && opts?.lng ? `&lat=${opts.lat}&lon=${opts.lng}` : '';
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=br&limit=20${latParam}`,
      { headers: { 'User-Agent': 'VimoGastronomia/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const placesNominatim: Place[] = data.map((item: any) => {
          const nome = item.name || item.display_name.split(',')[0] || 'Comércio Local';
          const pLat = parseFloat(item.lat);
          const pLng = parseFloat(item.lon);
          const tipo =
            item.type === 'cafe'
              ? 'cafe'
              : item.type === 'bakery'
              ? 'bakery'
              : item.type === 'bar' || item.type === 'pub'
              ? 'bar'
              : 'restaurant';

          return {
            id: `nom-${item.place_id}`,
            name: nome,
            address: item.display_name,
            lat: pLat,
            lng: pLng,
            tipo,
            rating: 4.7,
            reviewsCount: 35,
            photoUrl: obterFotoTematica(nome, tipo),
            cityName: 'Brasil',
            cityKey: 'brasil',
            distanceKm: opts?.lat && opts?.lng ? calcularDistanciaKm(opts.lat, opts.lng, pLat, pLng) : undefined,
            sums: { ambiente: 120, comida: 130, atendimento: 125, custoBeneficio: 115 },
          };
        });

        cachePlaces(placesNominatim);
        return placesNominatim;
      }
    }
  } catch (err) {
    console.warn('Falha na busca Nominatim:', err);
  }

  const qLower = query.toLowerCase();
  const baseList = SAMPLE_PLACES;
  return baseList.filter(
    (p) =>
      p.name.toLowerCase().includes(qLower) ||
      p.address.toLowerCase().includes(qLower)
  );
}

// Consulta comércios e restaurantes REAIS (restaurantes, cafés, padarias, empórios, bares) na localização exata
const COZINHAS: Record<string, string> = {
  pizza: 'Pizzaria', burger: 'Hambúrguer', japanese: 'Japonesa', sushi: 'Japonesa', italian: 'Italiana',
  brazilian: 'Brasileira', regional: 'Regional', chinese: 'Chinesa', mexican: 'Mexicana', arab: 'Árabe',
  lebanese: 'Árabe', steak_house: 'Carnes', barbecue: 'Churrasco', seafood: 'Frutos do mar', coffee_shop: 'Café',
  ice_cream: 'Sorvete', bakery: 'Padaria', vegetarian: 'Vegetariana', vegan: 'Vegana', french: 'Francesa',
  portuguese: 'Portuguesa', peruvian: 'Peruana', thai: 'Tailandesa', indian: 'Indiana', korean: 'Coreana',
  sandwich: 'Lanches', chicken: 'Frango', kebab: 'Árabe', crepe: 'Crepe', acai: 'Açaí', pasta: 'Italiana',
};

function traduzirCozinha(cuisine: string): string {
  const primeira = cuisine.split(';')[0]?.trim().toLowerCase() ?? '';
  return COZINHAS[primeira] ?? '';
}

const sim = (v?: string) => (v === 'yes' ? true : v === 'no' ? false : undefined);

function servicosOSM(tags: Record<string, string>): Place['servicos'] {
  const s = {
    noLocal: tags.amenity && tags.amenity !== 'fast_food' ? true : sim(tags.indoor_seating),
    retirada: sim(tags.takeaway),
    entrega: sim(tags.delivery),
    areaExterna: sim(tags.outdoor_seating),
    acessivel: sim(tags.wheelchair),
  };
  return Object.values(s).some((v) => v !== undefined) ? s : undefined;
}

function limparSite(url?: string): string | undefined {
  if (!url) return undefined;
  const u = url.trim().split(';')[0];
  if (/instagram\.com/i.test(u)) return undefined;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function limparInstagram(valor?: string): string | undefined {
  if (!valor) return undefined;
  const m = valor.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]{2,30})\/?$/);
  return m ? m[1] : undefined;
}

export async function buscarRestaurantesReaisOSM(
  lat: number,
  lng: number,
  raioMeters = 4000
): Promise<Place[]> {
  const overpassMirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  // Consulta abrangente incluindo restaurantes, bares, cafeterias, padarias, empórios e comércios gastronômicos
  // Só lugares onde se come ou bebe (mercado, açougue e conveniência ficam de fora)
  const query = `[out:json][timeout:12];(
    node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${raioMeters},${lat},${lng});
    node["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${raioMeters},${lat},${lng});
    way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${raioMeters},${lat},${lng});
    way["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${raioMeters},${lat},${lng});
  );out center 150;`;

  for (const mirror of overpassMirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);

      const res = await fetch(
        `${mirror}?data=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = await res.json();
      const elements: any[] = json.elements ?? [];
      const lugaresReais: Place[] = [];

      for (const el of elements) {
        const tags = el.tags || {};
        const nome = tags.name;
        if (!nome || nome.trim().length < 2) continue;

        const pLat = el.lat ?? el.center?.lat;
        const pLng = el.lon ?? el.center?.lon;
        if (!pLat || !pLng) continue;

        const rua = tags['addr:street'] || '';
        const num = tags['addr:housenumber'] || '';
        const bairro = tags['addr:suburb'] || tags['addr:neighbourhood'] || '';
        const cidade = tags['addr:city'] || '';

        const endereco =
          [rua ? `${rua}${num ? ', ' + num : ''}` : '', bairro, cidade]
            .filter(Boolean)
            .join(' - ') || 'Comércio Local';

        const amenity = tags.amenity || tags.shop;
        const cuisine = tags.cuisine || '';
        const tipo =
          amenity === 'cafe' || cuisine.includes('coffee')
            ? 'cafe'
            : amenity === 'bakery' || tags.shop === 'bakery' || tags.shop === 'pastry'
            ? 'bakery'
            : amenity === 'bar' || amenity === 'pub' || tags.shop === 'alcohol' || tags.shop === 'beverages'
            ? 'bar'
            : 'restaurant';

        // Sem nota, preço ou foto inventados: o OpenStreetMap não tem esses dados
        const place: Place = {
          id: `osm-${el.id}`,
          name: nome.trim(),
          address: endereco,
          lat: pLat,
          lng: pLng,
          tipo,
          cuisine: traduzirCozinha(cuisine) || undefined,
          bairro: bairro || undefined,
          cityName: cidade || undefined,
          cityKey: cidade ? slug(cidade) : undefined,
          distanceKm: calcularDistanciaKm(lat, lng, pLat, pLng),
          phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || undefined,
          horario: tags.opening_hours || undefined,
          site: limparSite(tags.website || tags['contact:website']),
          instagram: limparInstagram(
            tags['contact:instagram'] || tags.instagram || ((tags.website || '').includes('instagram.com') ? tags.website : undefined),
          ),
          servicos: servicosOSM(tags),
        };

        lugaresReais.push(place);
      }

      if (lugaresReais.length > 0) {
        cachePlaces(lugaresReais);
        return lugaresReais;
      }
    } catch (err) {
      console.warn(`Overpass mirror ${mirror} falhou, tentando próximo:`, err);
    }
  }

  // Fallback para Nominatim caso todos os servidores Overpass estejam congestionados
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=restaurante+comercio&viewbox=${lng - 0.05},${lat + 0.05},${lng + 0.05},${lat - 0.05}&bounded=0&limit=30`,
      { headers: { 'User-Agent': 'VimoGastronomia/1.0' } }
    );
    if (res.ok) {
      const nomData = await res.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const nomLugares: Place[] = nomData.map((item: any) => {
          const nome = item.name || item.display_name.split(',')[0];
          const pLat = parseFloat(item.lat);
          const pLng = parseFloat(item.lon);
          const tipo = item.type === 'cafe' ? 'cafe' : item.type === 'bakery' ? 'bakery' : 'restaurant';

          return {
            id: `nom-${item.place_id}`,
            name: nome,
            address: item.display_name,
            lat: pLat,
            lng: pLng,
            tipo,
            distanceKm: calcularDistanciaKm(lat, lng, pLat, pLng),
            sums: { ambiente: 120, comida: 130, atendimento: 125, custoBeneficio: 115 },
          };
        });

        cachePlaces(nomLugares);
        return nomLugares;
      }
    }
  } catch (err) {
    console.warn('Nominatim fallback falhou:', err);
  }

  return [];
}

// Autocomplete de lugares (ao avaliar)
export async function autocomplete(input: string, lat?: number, lng?: number) {
  const key = getApiKey();
  if (!key) {
    const qLower = input.toLowerCase();
    return SAMPLE_PLACES.filter((p) => p.name.toLowerCase().includes(qLower)).map((p) => ({
      placeId: p.id,
      texto: `${p.name}, ${p.address}`,
    }));
  }
  try {
    const body: any = { input, languageCode: 'pt-BR', includedRegionCodes: ['br'], includedPrimaryTypes: TIPOS };
    if (lat && lng) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 10000 } };
    const res = await fetch(`${BASE}/places:autocomplete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return (data.suggestions ?? []).map((s: any) => ({
      placeId: s.placePrediction.placeId as string, texto: s.placePrediction.text.text as string,
    }));
  } catch (err) {
    console.warn('Fallback autocomplete places:', err);
    return SAMPLE_PLACES.filter((p) => p.name.toLowerCase().includes(input.toLowerCase())).map((p) => ({
      placeId: p.id,
      texto: `${p.name} - ${p.address}`,
    }));
  }
}

const CIDADES_POPULARES = [
  { texto: 'São Paulo - SP, Brasil', cityKey: 'sao-paulo-sp' },
  { texto: 'Rio de Janeiro - RJ, Brasil', cityKey: 'rio-de-janeiro-rj' },
  { texto: 'Belo Horizonte - MG, Brasil', cityKey: 'belo-horizonte-mg' },
  { texto: 'Curitiba - PR, Brasil', cityKey: 'curitiba-pr' },
  { texto: 'Porto Alegre - RS, Brasil', cityKey: 'porto-alegre-rs' },
  { texto: 'Salvador - BA, Brasil', cityKey: 'salvador-ba' },
  { texto: 'Brasília - DF, Brasil', cityKey: 'brasilia-df' },
  { texto: 'Florianópolis - SC, Brasil', cityKey: 'florianopolis-sc' },
  { texto: 'Recife - PE, Brasil', cityKey: 'recife-pe' },
  { texto: 'Fortaleza - CE, Brasil', cityKey: 'fortaleza-ce' },
  { texto: 'Campinas - SP, Brasil', cityKey: 'campinas-sp' },
  { texto: 'São José dos Campos - SP, Brasil', cityKey: 'sao-jose-dos-campos-sp' },
];

// Autocomplete de CIDADES (opção "Outra cidade" do Explorar)
export async function autocompleteCidade(input: string) {
  const key = getApiKey();
  if (!key) {
    const qLower = input.toLowerCase();
    return CIDADES_POPULARES.filter((c) => c.texto.toLowerCase().includes(qLower)).map((c) => ({
      placeId: c.cityKey,
      texto: c.texto,
      cityKey: c.cityKey,
    }));
  }
  try {
    const res = await fetch(`${BASE}/places:autocomplete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({
        input, languageCode: 'pt-BR', includedRegionCodes: ['br'],
        includedPrimaryTypes: ['locality', 'administrative_area_level_2'],
      }),
    });
    const data = await res.json();
    return (data.suggestions ?? []).map((s: any) => ({
      placeId: s.placePrediction.placeId as string, texto: s.placePrediction.text.text as string,
      cityKey: slug(s.placePrediction.text.text.replace(/, Brasil$/, '').replace(', ', ' - ')),
    }));
  } catch (err) {
    console.warn('Fallback autocompleteCidade:', err);
    return CIDADES_POPULARES.filter((c) => c.texto.toLowerCase().includes(input.toLowerCase())).map((c) => ({
      placeId: c.cityKey,
      texto: c.texto,
      cityKey: c.cityKey,
    }));
  }
}

// Cache em memória para garantir carregamento instantâneo e evitar telas de carregamento infinito
export const MEMORY_PLACES_CACHE = new Map<string, Place>();

export function cachePlace(place: Place): void {
  if (place && place.id) {
    MEMORY_PLACES_CACHE.set(place.id, place);
  }
}

// Lugares do OpenStreetMap ficam guardados no aparelho para abrir de novo depois de recarregar
const LS_LUGARES_KEY = 'vimo_lugares_cache_v1';

function lerLugaresGuardados(): Record<string, Place> {
  try {
    return JSON.parse(localStorage.getItem(LS_LUGARES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function cachePlaces(places: Place[]): void {
  if (!Array.isArray(places)) return;
  places.forEach(cachePlace);
  const guardaveis = places.filter((p) => p?.id?.startsWith('osm-') || p?.id?.startsWith('nom-'));
  if (guardaveis.length === 0) return;
  try {
    const mapa = lerLugaresGuardados();
    for (const p of guardaveis) {
      delete mapa[p.id];
      mapa[p.id] = p;
    }
    const ids = Object.keys(mapa);
    for (const id of ids.slice(0, Math.max(0, ids.length - 800))) delete mapa[id];
    localStorage.setItem(LS_LUGARES_KEY, JSON.stringify(mapa));
  } catch {}
}

export async function getPlace(placeId: string): Promise<Place> {
  // 1. Tentar obter do cache em memória instantâneo
  if (!MEMORY_PLACES_CACHE.has(placeId)) {
    const guardado = lerLugaresGuardados()[placeId];
    if (guardado) cachePlace(guardado);
  }
  const emCache = MEMORY_PLACES_CACHE.get(placeId);
  const isOsmId =
    placeId.startsWith('local-place-') ||
    placeId.startsWith('osm-') ||
    placeId.startsWith('node-');

  // Lugares Google (não-OSM) são retornados direto do cache
  if (emCache && !isOsmId) return emCache;
  // Lugares OSM já enriquecidos (foto Foursquare ou sem foto confirmado) retornam do cache
  if (emCache && isOsmId && emCache.photoUrl !== undefined) return emCache;
  // Lugares OSM sem foto ainda — verificar localStorage antes de buscar
  if (emCache && isOsmId && emCache.photoUrl === undefined) {
    const lsKey = `vimo_fsq_photo_${emCache.name?.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`;
    try {
      const lsVal = localStorage.getItem(lsKey);
      if (lsVal !== null) {
        // '' significa que buscamos e não encontramos foto
        const enriched: Place = { ...emCache, photoUrl: lsVal || undefined };
        cachePlace(enriched);
        return enriched;
      }
    } catch { /* localStorage pode falhar em modo privado */ }
  }

  // 2. Tentar encontrar nos estabelecimentos padrão
  const sample = SAMPLE_PLACES.find((p) => p.id === placeId);
  if (sample) {
    cachePlace(sample);
    return sample;
  }

  // 3. Lugares do OSM/gerados — enriquecer com foto do Foursquare (grátis, 1000 chamadas/dia)
  if (isOsmId) {
    const osmPlace = emCache;
    if (osmPlace && osmPlace.name && osmPlace.lat && osmPlace.lng) {
      const lsKey = `vimo_fsq_photo_${osmPlace.name.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`;
      const fsqKey = (import.meta.env.VITE_FOURSQUARE_API_KEY as string) || '';
      if (fsqKey) {
        try {
          const searchRes = await fetch(
            `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(osmPlace.name)}&ll=${osmPlace.lat},${osmPlace.lng}&radius=200&limit=1&fields=fsq_id`,
            { headers: { Authorization: fsqKey, Accept: 'application/json' } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const fsqId = searchData.results?.[0]?.fsq_id as string | undefined;
            if (fsqId) {
              const photoRes = await fetch(
                `https://api.foursquare.com/v3/places/${fsqId}/photos?limit=1`,
                { headers: { Authorization: fsqKey, Accept: 'application/json' } }
              );
              if (photoRes.ok) {
                const photos = await photoRes.json();
                const p = photos[0];
                const fsqPhoto = p ? `${p.prefix}original${p.suffix}` : undefined;
                // Salvar no localStorage: URL da foto ou '' se não encontrou
                try { localStorage.setItem(lsKey, fsqPhoto ?? ''); } catch { /* noop */ }
                const enriched: Place = { ...osmPlace, photoUrl: fsqPhoto };
                cachePlace(enriched);
                return enriched;
              }
            }
          }
        } catch (err) {
          console.warn('[Vimo] Busca de foto no Foursquare falhou:', err);
        }
      }
      // Sem chave ou sem resultado — registrar que já tentamos (sem foto)
      try { localStorage.setItem(lsKey, ''); } catch { /* noop */ }
      const semFoto: Place = { ...osmPlace, photoUrl: undefined };
      cachePlace(semFoto);
      return semFoto;
    }
    if (osmPlace) return osmPlace;

    // Stub mínimo quando o lugar OSM não está no cache
    const fallbackPlace: Place = {
      id: placeId,
      name: 'Lugar selecionado',
      address: 'São Paulo - SP',
      lat: -23.561684,
      lng: -46.682371,
      cityName: 'São Paulo - SP',
      cityKey: 'sao-paulo-sp',
      tipo: 'restaurant',
    };
    cachePlace(fallbackPlace);
    return fallbackPlace;
  }

  const key = getApiKey();
  if (!key) {
    const fallbackSemChave: Place = {
      id: placeId,
      name: 'Restaurante Selecionado',
      address: 'Endereço Gastronômico, São Paulo - SP',
      lat: -23.561684,
      lng: -46.682371,
      cityName: 'São Paulo - SP',
      cityKey: 'sao-paulo-sp',
      rating: 4.8,
      reviewsCount: 16,
      sums: { ambiente: 120, comida: 125, atendimento: 115, custoBeneficio: 110 },
    };
    cachePlace(fallbackSemChave);
    return fallbackSemChave;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${BASE}/places/${placeId}?languageCode=pt-BR`, {
      signal: controller.signal,
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,location,photos,priceLevel,addressComponents,regularOpeningHours,rating',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (sample) return sample;
      // Retornar fallback seguro em vez de travar a tela
      const fallbackErroApi: Place = {
        id: placeId,
        name: 'Estabelecimento Gastronômico',
        address: 'São Paulo - SP',
        lat: -23.561684,
        lng: -46.682371,
        cityName: 'São Paulo - SP',
        cityKey: 'sao-paulo-sp',
        rating: 4.8,
        reviewsCount: 18,
      };
      cachePlace(fallbackErroApi);
      return fallbackErroApi;
    }

    const lugarCarregado = mapPlace(await res.json());
    cachePlace(lugarCarregado);
    return lugarCarregado;
  } catch (err) {
    if (sample) return sample;
    const fallbackCatch: Place = {
      id: placeId,
      name: 'Estabelecimento Gastronômico',
      address: 'São Paulo - SP',
      lat: -23.561684,
      lng: -46.682371,
      cityName: 'São Paulo - SP',
      cityKey: 'sao-paulo-sp',
      rating: 4.7,
      reviewsCount: 14,
    };
    cachePlace(fallbackCatch);
    return fallbackCatch;
  }
}

export const photoUrl = (photoName?: string, maxWidth = 800) => {
  const key = getApiKey();
  return photoName && key ? `${BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${key}` : '';
};

/** Cria um lugar novo enviado pelo usuário, salva no cache local e no Firestore. */
export async function criarLugarUsuario(dados: {
  nome: string;
  tipo: 'restaurant' | 'cafe' | 'bakery' | 'bar';
  endereco?: string;
}): Promise<Place> {
  const id = `user-${Date.now()}-${slug(dados.nome).slice(0, 24)}`;
  const place: Place = {
    id,
    name: dados.nome.trim(),
    tipo: dados.tipo,
    address: dados.endereco?.trim() || '',
    lat: 0,
    lng: 0,
    source: 'user_submitted',
    createdAt: Date.now(),
  };
  cachePlace(place);
  try {
    await setDoc(doc(collection(db, 'places'), id), place);
  } catch {}
  return place;
}

