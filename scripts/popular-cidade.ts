/**
 * Busca lugares de uma cidade via Overpass (OpenStreetMap) e grava no Firestore.
 *
 * Uso:
 *   npx tsx scripts/popular-cidade.ts "São José dos Campos" SP
 *   npx tsx scripts/popular-cidade.ts "Campinas" SP
 *
 * Pré-requisitos:
 *   - Arquivo firebase-key.json na mesma pasta deste script (service account do Firebase)
 *     Baixe em: Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import firebaseConfig from '../firebase-applet-config.json';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cidadeArg = process.argv[2];
const ufArg = process.argv[3];
if (!cidadeArg) {
  console.error('Uso: npx tsx scripts/popular-cidade.ts "Nome da Cidade" UF');
  process.exit(1);
}

const nomeCidade = ufArg ? `${cidadeArg} - ${ufArg.toUpperCase()}` : cidadeArg;
const cityKey = nomeCidade.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ── helpers ──────────────────────────────────────────────────────────────────

function calcularDistanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function limparSite(url?: string): string | undefined {
  if (!url) return undefined;
  const s = url.trim();
  return s.startsWith('http') ? s : `https://${s}`;
}

function limparInstagram(val?: string): string | undefined {
  if (!val) return undefined;
  const m = val.match(/instagram\.com\/([^/?#]+)/);
  if (m) return m[1];
  return val.replace(/^@/, '') || undefined;
}

interface OSMTags { [k: string]: string }

function servicosOSM(tags: OSMTags) {
  const s: Record<string, boolean> = {};
  if (tags['outdoor_seating'] === 'yes') s.areaExterna = true;
  if (tags['wheelchair'] === 'yes') s.acessivel = true;
  if (tags['delivery'] === 'yes') s.entrega = true;
  if (tags['takeaway'] === 'yes') s.retirada = true;
  if (tags['dine_in'] !== 'no') s.noLocal = true;
  return Object.keys(s).length ? s : undefined;
}

const COZINHA_MAP: Record<string, string> = {
  pizza: 'Pizza', burger: 'Hambúrguer', sushi: 'Japonesa', japanese: 'Japonesa',
  italian: 'Italiana', french: 'Francesa', brazilian: 'Brasileira', churrasco: 'Churrascaria',
  mexican: 'Mexicana', chinese: 'Chinesa', arab: 'Árabe', seafood: 'Frutos do Mar',
  coffee: 'Café', bakery: 'Padaria', ice_cream: 'Sorvetes', vegan: 'Vegano',
  vegetarian: 'Vegetariano', sandwich: 'Sanduíche',
};

function traduzirCozinha(c: string): string {
  for (const [k, v] of Object.entries(COZINHA_MAP)) {
    if (c.toLowerCase().includes(k)) return v;
  }
  return '';
}

// ── 1. Nominatim: coordenadas da cidade ──────────────────────────────────────

console.log(`Buscando coordenadas de "${nomeCidade}"...`);

const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(cidadeArg + (ufArg ? ` ${ufArg}` : ''))}`;
const nominatimRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'VimoGastronomia/1.0' } });
if (!nominatimRes.ok) { console.error('Falha no Nominatim'); process.exit(1); }
const nominatimData = await nominatimRes.json() as { lat: string; lon: string }[];
if (!nominatimData.length) { console.error(`Cidade "${nomeCidade}" não encontrada.`); process.exit(1); }

const cidadeLat = parseFloat(nominatimData[0].lat);
const cidadeLng = parseFloat(nominatimData[0].lon);
console.log(`  → lat ${cidadeLat}, lng ${cidadeLng}`);

// ── 2. Overpass: lugares da cidade ───────────────────────────────────────────

const RAIO = 8000;
const query = `[out:json][timeout:25];(
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${RAIO},${cidadeLat},${cidadeLng});
  node["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${RAIO},${cidadeLat},${cidadeLng});
  way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${RAIO},${cidadeLat},${cidadeLng});
  way["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${RAIO},${cidadeLat},${cidadeLng});
);out center 500;`;

const mirrors = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

let elementos: any[] = [];
console.log('Consultando Overpass (OpenStreetMap)...');
for (const mirror of mirrors) {
  try {
    const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`);
    if (!res.ok) continue;
    const json = await res.json() as { elements: any[] };
    elementos = json.elements ?? [];
    if (elementos.length) break;
  } catch (e) {
    console.warn(`  mirror ${mirror} falhou, tentando próximo`);
  }
}

if (!elementos.length) { console.error('Nenhum lugar encontrado pelo Overpass.'); process.exit(1); }

// ── 3. Normalizar ────────────────────────────────────────────────────────────

const lugares: Record<string, unknown>[] = [];

for (const el of elementos) {
  const tags: OSMTags = el.tags || {};
  const nome: string = tags.name;
  if (!nome || nome.trim().length < 2) continue;

  const pLat: number = el.lat ?? el.center?.lat;
  const pLng: number = el.lon ?? el.center?.lon;
  if (!pLat || !pLng) continue;

  const rua = tags['addr:street'] || '';
  const num = tags['addr:housenumber'] || '';
  const bairro = tags['addr:suburb'] || tags['addr:neighbourhood'] || '';
  const cidadeTag = tags['addr:city'] || cidadeArg;
  const endereco =
    [rua ? `${rua}${num ? ', ' + num : ''}` : '', bairro, cidadeTag]
      .filter(Boolean).join(' - ') || cidadeArg;

  const amenity = tags.amenity || tags.shop;
  const cuisine = tags.cuisine || '';
  const tipo =
    amenity === 'cafe' || cuisine.includes('coffee') ? 'cafe'
    : amenity === 'bakery' || tags.shop === 'bakery' || tags.shop === 'pastry' ? 'bakery'
    : amenity === 'bar' || amenity === 'pub' ? 'bar'
    : 'restaurant';

  const id = `osm-${el.id}`;
  const lugar: Record<string, unknown> = {
    id,
    name: nome.trim(),
    address: endereco,
    lat: pLat,
    lng: pLng,
    tipo,
    cityKey,
    cityName: nomeCidade,
    distanceKm: parseFloat(calcularDistanciaKm(cidadeLat, cidadeLng, pLat, pLng).toFixed(2)),
  };

  const coz = traduzirCozinha(cuisine);
  if (coz) lugar.cuisine = coz;
  if (bairro) lugar.bairro = bairro;
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];
  if (phone) lugar.phone = phone;
  const horario = tags.opening_hours;
  if (horario) lugar.horario = horario;
  const site = limparSite(tags.website || tags['contact:website']);
  if (site) lugar.site = site;
  const ig = limparInstagram(tags['contact:instagram'] || tags.instagram);
  if (ig) lugar.instagram = ig;
  const servicos = servicosOSM(tags);
  if (servicos) lugar.servicos = servicos;

  lugares.push(lugar);
}

console.log(`  → ${lugares.length} lugares encontrados`);

// ── 4. Gravar no Firestore ────────────────────────────────────────────────────

const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const { initializeApp, cert } = require('firebase-admin/app') as typeof import('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

const keyPath = resolve(__dirname, 'firebase-key.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore((firebaseConfig as Record<string, string>).firestoreDatabaseId ?? '(default)');

console.log(`Gravando no Firestore (projeto: ${firebaseConfig.projectId})...`);
const BATCH_SIZE = 500;
let total = 0;
for (let i = 0; i < lugares.length; i += BATCH_SIZE) {
  const lote = lugares.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  for (const l of lote) {
    batch.set(db.collection('places').doc(l.id as string), l, { merge: true });
  }
  await batch.commit();
  total += lote.length;
  console.log(`  ${total}/${lugares.length} gravados`);
}

console.log(`\nConcluído. ${total} lugares de ${nomeCidade} importados com cityKey="${cityKey}".`);
