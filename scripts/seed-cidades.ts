/**
 * Popula o Firestore com estabelecimentos de uma cidade via Overpass (OpenStreetMap).
 * Usada pelo server.ts no startup e pelo script popular-cidade.ts via CLI.
 *
 * Requer variável de ambiente FIREBASE_SERVICE_ACCOUNT com o JSON da service account
 * (Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada → copiar conteúdo).
 * Sem ela, a função retorna imediatamente sem erro.
 */

import firebaseConfig from '../firebase-applet-config.json';

export interface LugarSeed {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tipo: 'restaurant' | 'cafe' | 'bakery' | 'bar';
  cityKey: string;
  cityName: string;
  distanceKm: number;
  bairro?: string;
  cuisine?: string;
  phone?: string;
  horario?: string;
  site?: string;
  instagram?: string;
  servicos?: Record<string, boolean>;
  source: 'openstreetmap';
  createdAt: number;
}

interface OSMTags { [k: string]: string }

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const COZINHA_MAP: Record<string, string> = {
  pizza: 'Pizza', burger: 'Hambúrguer', sushi: 'Japonesa', japanese: 'Japonesa',
  italian: 'Italiana', french: 'Francesa', brazilian: 'Brasileira', churrasco: 'Churrascaria',
  mexican: 'Mexicana', chinese: 'Chinesa', arab: 'Árabe', seafood: 'Frutos do Mar',
  coffee: 'Café', bakery: 'Padaria', ice_cream: 'Sorvetes', vegan: 'Vegano',
  vegetarian: 'Vegetariano', sandwich: 'Sanduíche', steak: 'Carnes', kebab: 'Árabe',
  fish: 'Frutos do Mar', acai: 'Açaí', crepe: 'Crepe', tapioca: 'Tapioca',
};

function traduzirCozinha(c: string): string {
  const primeiros = c.toLowerCase().split(';')[0]?.trim() ?? '';
  for (const [k, v] of Object.entries(COZINHA_MAP)) {
    if (primeiros.includes(k)) return v;
  }
  return '';
}

function limparSite(url?: string): string | undefined {
  if (!url) return undefined;
  const u = url.trim().split(';')[0];
  if (/instagram\.com/i.test(u)) return undefined;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function limparInstagram(val?: string): string | undefined {
  if (!val) return undefined;
  const m = val.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]{2,30})\/?$/);
  return m ? m[1] : undefined;
}

function servicosOSM(tags: OSMTags): Record<string, boolean> | undefined {
  const s: Record<string, boolean> = {};
  if (tags['outdoor_seating'] === 'yes') s.areaExterna = true;
  if (tags['wheelchair'] === 'yes') s.acessivel = true;
  if (tags['delivery'] === 'yes') s.entrega = true;
  if (tags['takeaway'] === 'yes') s.retirada = true;
  if (tags['dine_in'] !== 'no') s.noLocal = true;
  return Object.keys(s).length ? s : undefined;
}

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

export function slugCidade(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Busca todos os estabelecimentos de uma cidade via Overpass usando a fronteira administrativa. */
export async function buscarEstabelecimentosOSM(
  nomeCidade: string,
  lat: number,
  lng: number,
  cityKey: string,
): Promise<LugarSeed[]> {
  // Usa área administrativa do OSM para cobrir toda a cidade (não só raio)
  const queryArea = `[out:json][timeout:60];
area["name"="${nomeCidade}"]["admin_level"~"^(7|8)$"]["boundary"="administrative"]->.cidade;
(
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](area.cidade);
  node["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](area.cidade);
  way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](area.cidade);
  way["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](area.cidade);
);out center 2000;`;

  // Fallback com raio grande caso a query por área falhe
  const queryRaio = `[out:json][timeout:60];(
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:25000,${lat},${lng});
  node["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:25000,${lat},${lng});
  way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:25000,${lat},${lng});
  way["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:25000,${lat},${lng});
);out center 2000;`;

  for (const tentativa of ['area', 'raio'] as const) {
    const query = tentativa === 'area' ? queryArea : queryRaio;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
          signal: AbortSignal.timeout(65000),
          headers: { 'User-Agent': 'VimoGastronomia/1.0' },
        });
        if (!res.ok) continue;
        const json = await res.json() as { elements: any[] };
        const elementos = json.elements ?? [];
        if (!elementos.length) continue;

        const nomeCidadeFormatado = nomeCidade.includes(' - ') ? nomeCidade
          : `${nomeCidade} - SP`;
        const lugares: LugarSeed[] = [];

        for (const el of elementos) {
          const tags: OSMTags = el.tags || {};
          const nome = tags.name?.trim();
          if (!nome || nome.length < 2) continue;

          const pLat: number = el.lat ?? el.center?.lat;
          const pLng: number = el.lon ?? el.center?.lon;
          if (!pLat || !pLng) continue;

          const rua = tags['addr:street'] || '';
          const num = tags['addr:housenumber'] || '';
          const bairro = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] || '';
          const cidadeTag = tags['addr:city'] || nomeCidade;
          const endereco =
            [rua ? `${rua}${num ? ', ' + num : ''}` : '', bairro, cidadeTag]
              .filter(Boolean).join(' - ') || nomeCidade;

          const amenity = tags.amenity || tags.shop;
          const cuisine = tags.cuisine || '';
          const tipo =
            amenity === 'cafe' || cuisine.includes('coffee') ? 'cafe'
            : amenity === 'bakery' || tags.shop === 'bakery' || tags.shop === 'pastry'
              || tags.shop === 'confectionery' ? 'bakery'
            : amenity === 'bar' || amenity === 'pub' || amenity === 'biergarten' ? 'bar'
            : 'restaurant';

          const lugar: LugarSeed = {
            id: `osm-${el.id}`,
            name: nome,
            address: endereco,
            lat: pLat,
            lng: pLng,
            tipo: tipo as LugarSeed['tipo'],
            cityKey,
            cityName: nomeCidadeFormatado,
            distanceKm: distanciaKm(lat, lng, pLat, pLng),
            source: 'openstreetmap',
            createdAt: Date.now(),
          };

          const coz = traduzirCozinha(cuisine);
          if (coz) lugar.cuisine = coz;
          if (bairro) lugar.bairro = bairro;
          const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];
          if (phone) lugar.phone = phone;
          if (tags.opening_hours) lugar.horario = tags.opening_hours;
          const site = limparSite(tags.website || tags['contact:website']);
          if (site) lugar.site = site;
          const ig = limparInstagram(tags['contact:instagram'] || tags.instagram);
          if (ig) lugar.instagram = ig;
          const servicos = servicosOSM(tags);
          if (servicos) lugar.servicos = servicos;

          lugares.push(lugar);
        }

        if (lugares.length > 0) {
          console.log(`[seed] Overpass (${tentativa}, ${mirror}): ${lugares.length} lugares`);
          return lugares;
        }
      } catch (e: any) {
        console.warn(`[seed] mirror ${mirror} falhou: ${e.message}`);
      }
    }
  }

  return [];
}

/** Inicializa o app firebase-admin a partir de variável de ambiente ou arquivo. */
function initAdmin(): { db: any } | null {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!envJson) return null;

  try {
    const { initializeApp, cert, getApps } = require('firebase-admin/app') as typeof import('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

    if (!getApps().length) {
      const serviceAccount = JSON.parse(envJson);
      initializeApp({ credential: cert(serviceAccount) });
    }
    const db = getFirestore((firebaseConfig as Record<string, string>).firestoreDatabaseId ?? '(default)');
    return { db };
  } catch (e: any) {
    console.error('[seed] Falha ao inicializar firebase-admin:', e.message);
    return null;
  }
}

/** Verifica se a cidade já foi importada (≥ 5 lugares no Firestore). */
export async function cidadeJaImportada(cityKey: string): Promise<boolean> {
  const admin = initAdmin();
  if (!admin) return false;
  try {
    const snap = await admin.db.collection('places')
      .where('cityKey', '==', cityKey)
      .limit(5)
      .get();
    return snap.size >= 5;
  } catch {
    return false;
  }
}

/** Importa todos os lugares de uma cidade para o Firestore (deduplica por id OSM). */
export async function importarCidade(
  nomeCidade: string,
  lat: number,
  lng: number,
  cityKey?: string,
): Promise<{ importados: number; pulados: number }> {
  const ck = cityKey ?? slugCidade(nomeCidade);
  const admin = initAdmin();
  if (!admin) {
    console.warn('[seed] FIREBASE_SERVICE_ACCOUNT não configurado — seed ignorado');
    return { importados: 0, pulados: 0 };
  }

  const lugares = await buscarEstabelecimentosOSM(nomeCidade, lat, lng, ck);
  if (!lugares.length) return { importados: 0, pulados: 0 };

  const BATCH = 400;
  let importados = 0;
  let pulados = 0;

  for (let i = 0; i < lugares.length; i += BATCH) {
    const lote = lugares.slice(i, i + BATCH);
    // Verifica quais já existem para não sobrescrever dados (reviews, notas etc.)
    const batch = admin.db.batch();
    for (const l of lote) {
      const ref = admin.db.collection('places').doc(l.id);
      // merge: true preserva campos que o usuário possa ter adicionado (ex: googlePlaceId, reviews)
      batch.set(ref, l, { merge: true });
      importados++;
    }
    await batch.commit();
  }

  console.log(`[seed] ${nomeCidade}: ${importados} lugares gravados, ${pulados} ignorados`);
  return { importados, pulados };
}
