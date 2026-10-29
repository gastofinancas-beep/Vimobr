import type { Place } from '../types';
import { SAMPLE_PLACES, buscarRestaurantesReaisOSM, cachePlaces, slug } from './places';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, writeBatch, doc } from 'firebase/firestore';
import { auth } from './firebase';

// Cidade do Descobrir: vem do GPS (com autorização) ou da escolha manual.
// Lugares vêm do Firestore (coleção `places`) quando a cidade foi importada,
// ou do OpenStreetMap como fallback.

export interface CidadeAtual {
  cityKey: string;
  /** "Campinas - SP" */
  nome: string;
  lat: number;
  lng: number;
  origem: 'gps' | 'manual';
}

export type FalhaLocalizacao = 'negado' | 'indisponivel' | 'tempo';

const LS_CIDADE = 'vimo_cidade_v1';
const LS_LUGARES_CIDADE = 'vimo_lugares_cidade_v2_';
const VALIDADE_LUGARES = 24 * 60 * 60 * 1000;
const NOMINATIM = 'https://nominatim.openstreetmap.org';

export function cidadeSalva(): CidadeAtual | null {
  try {
    const raw = localStorage.getItem(LS_CIDADE);
    return raw ? (JSON.parse(raw) as CidadeAtual) : null;
  } catch {
    return null;
  }
}

export function salvarCidade(c: CidadeAtual): void {
  try {
    localStorage.setItem(LS_CIDADE, JSON.stringify(c));
  } catch {}
}

/** Estado da permissão sem abrir o pedido. 'prompt' quando o navegador não informa. */
export async function permissaoLocalizacao(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const r = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return r?.state ?? 'prompt';
  } catch {
    return 'prompt';
  }
}

/** Abre o pedido de autorização do sistema (na primeira vez) e devolve as coordenadas. */
export function pedirLocalizacao(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject('indisponivel' satisfies FalhaLocalizacao);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject((err.code === err.PERMISSION_DENIED ? 'negado' : err.code === err.TIMEOUT ? 'tempo' : 'indisponivel') satisfies FalhaLocalizacao),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

interface EnderecoNominatim {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  'ISO3166-2-lvl4'?: string;
}

function nomeDaCidade(a: EnderecoNominatim): string | null {
  const cidade = a.city || a.town || a.municipality || a.village || a.county;
  if (!cidade) return null;
  const uf = a['ISO3166-2-lvl4']?.replace(/^BR-/, '');
  return uf && uf.length === 2 ? `${cidade} - ${uf}` : cidade;
}

async function buscarJson<T>(url: string, ms = 8000): Promise<T> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), ms);
  try {
    const res = await fetch(url, { signal: controle.signal, headers: { 'Accept-Language': 'pt-BR' } });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } finally {
    clearTimeout(prazo);
  }
}

/** Coordenadas → "Cidade - UF". */
export async function cidadeDasCoordenadas(lat: number, lng: number): Promise<CidadeAtual> {
  let nome: string | null = null;
  try {
    const r = await buscarJson<{ address?: EnderecoNominatim }>(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
    );
    nome = r.address ? nomeDaCidade(r.address) : null;
  } catch {}
  const final = nome ?? 'Perto de você';
  return { cityKey: nome ? slug(final) : 'perto-de-voce', nome: final, lat, lng, origem: 'gps' };
}

/** Busca de cidades brasileiras pelo nome, para trocar de cidade sem GPS. */
export async function buscarCidades(texto: string): Promise<CidadeAtual[]> {
  if (texto.trim().length < 3) return [];
  const r = await buscarJson<{ lat: string; lon: string; addresstype?: string; address?: EnderecoNominatim }[]>(
    `${NOMINATIM}/search?format=jsonv2&countrycodes=br&addressdetails=1&limit=8&q=${encodeURIComponent(texto.trim())}`,
  );
  const vistas = new Set<string>();
  const cidades: CidadeAtual[] = [];
  for (const item of r) {
    if (!item.address || !['city', 'town', 'municipality', 'village'].includes(item.addresstype ?? '')) continue;
    const nome = nomeDaCidade(item.address);
    if (!nome || vistas.has(nome)) continue;
    vistas.add(nome);
    cidades.push({ cityKey: slug(nome), nome, lat: parseFloat(item.lat), lng: parseFloat(item.lon), origem: 'manual' });
  }
  return cidades;
}

interface LugaresGuardados {
  em: number;
  lugares: Place[];
}

/** Lugares guardados no aparelho para a cidade (abre na hora; a busca atualiza depois). */
export function lugaresGuardados(cidade: CidadeAtual): Place[] | null {
  try {
    const raw = localStorage.getItem(LS_LUGARES_CIDADE + cidade.cityKey);
    if (!raw) return null;
    const g = JSON.parse(raw) as LugaresGuardados;
    cachePlaces(g.lugares);
    return g.lugares;
  } catch {
    return null;
  }
}

function lugaresGuardadosValidos(cidade: CidadeAtual): boolean {
  try {
    const raw = localStorage.getItem(LS_LUGARES_CIDADE + cidade.cityKey);
    return !!raw && Date.now() - (JSON.parse(raw) as LugaresGuardados).em < VALIDADE_LUGARES;
  } catch {
    return false;
  }
}

/** Salva lugares no Firestore em segundo plano; só roda quando o usuário está autenticado. */
async function salvarLugaresFirestore(lugares: Place[], cidade: CidadeAtual): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const col = collection(db, 'places');
    for (let i = 0; i < lugares.length; i += 400) {
      const batch = writeBatch(db);
      for (const place of lugares.slice(i, i + 400)) {
        batch.set(
          doc(col, place.id),
          { ...place, cityName: place.cityName ?? cidade.nome, cityKey: cidade.cityKey, source: 'openstreetmap', createdAt: Date.now() },
          { merge: true },
        );
      }
      await batch.commit();
    }
  } catch {}
}

/** Busca lugares da coleção `places` no Firestore para a cidade dada. */
async function buscarLugaresFirestore(cidade: CidadeAtual): Promise<Place[]> {
  try {
    const q = query(
      collection(db, 'places'),
      where('cityKey', '==', cidade.cityKey),
      orderBy('distanceKm'),
      limit(300),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Place);
  } catch {
    return [];
  }
}

/** Restaurantes, cafés, padarias e bares da cidade, do mais perto ao mais longe do ponto dela. */
export async function carregarLugaresDaCidade(cidade: CidadeAtual, forcar = false): Promise<Place[]> {
  const guardados = lugaresGuardados(cidade);
  if (guardados && !forcar && lugaresGuardadosValidos(cidade)) return guardados;

  // Tenta o Firestore primeiro; cai no OSM se a cidade não foi importada
  const doFirestore = await buscarLugaresFirestore(cidade);
  let lista: Place[];
  if (doFirestore.length >= 5) {
    const exemplos = SAMPLE_PLACES.filter((p) => p.cityKey === cidade.cityKey);
    lista = [...exemplos, ...doFirestore];
  } else {
    const encontrados = await buscarRestaurantesReaisOSM(cidade.lat, cidade.lng, 5000);
    const daCidade: Place[] = encontrados
      .filter((p) => !p.id.startsWith('nom-'))
      .map((p) => ({ ...p, cityName: p.cityName ?? cidade.nome, cityKey: cidade.cityKey }));
    const exemplos = SAMPLE_PLACES.filter((p) => p.cityKey === cidade.cityKey);
    lista = [...exemplos, ...daCidade.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))];
    // Salva no Firestore em segundo plano para que a próxima visita (de qualquer usuário) seja instantânea
    if (daCidade.length > 0) void salvarLugaresFirestore(daCidade, cidade);
  }

  if (lista.length === 0) return guardados ?? [];
  cachePlaces(lista);
  try {
    localStorage.setItem(LS_LUGARES_CIDADE + cidade.cityKey, JSON.stringify({ em: Date.now(), lugares: lista }));
  } catch {}
  return lista;
}
