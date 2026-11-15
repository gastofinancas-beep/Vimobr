import type { Place } from '../types';
import { buscarRestaurantesReaisOSM, cachePlaces, slug } from './places';
import { db } from './firebase';
import { collection, query, where, getDocs, limit, writeBatch, doc } from 'firebase/firestore';
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

/** Campos que o catálogo guarda. `distanceKm` fica de fora: é a distância de quem buscou. */
function paraCatalogo(place: Place, cidade: CidadeAtual) {
  const { distanceKm: _d, ...resto } = place;
  return JSON.parse(JSON.stringify({
    ...resto,
    cityName: place.cityName ?? cidade.nome,
    cityKey: cidade.cityKey,
    source: 'openstreetmap',
    createdAt: Date.now(),
  }));
}

/**
 * Grava no catálogo do app (coleção `places`) os lugares do OSM que ainda não estão lá.
 * Roda em segundo plano e só com alguém logado (a regra exige). Lotes pequenos: se um
 * lote falhar (ex.: outra pessoa gravou o mesmo lugar ao mesmo tempo), os outros seguem.
 */
async function salvarLugaresFirestore(lugares: Place[], cidade: CidadeAtual): Promise<number> {
  // No início do app o login ainda está sendo restaurado; sem esperar, a gravação era pulada
  await auth.authStateReady().catch(() => {});
  if (!auth.currentUser) return 0;
  const col = collection(db, 'places');
  let gravados = 0;
  for (let i = 0; i < lugares.length; i += 100) {
    const parte = lugares.slice(i, i + 100);
    const batch = writeBatch(db);
    for (const place of parte) batch.set(doc(col, place.id), paraCatalogo(place, cidade));
    try {
      await batch.commit();
      gravados += parte.length;
    } catch (err) {
      console.warn('Catálogo: lote de lugares não gravado:', err);
    }
  }
  return gravados;
}

const cidadesConferidas = new Set<string>();

/**
 * Garante que a cidade está no catálogo do app. Confere uma vez por sessão: se o banco
 * tem menos lugares do que a lista do aparelho, grava os que faltam.
 */
async function completarCatalogo(cidade: CidadeAtual, lugares: Place[]): Promise<void> {
  if (cidadesConferidas.has(cidade.cityKey)) return;
  const doOsm = lugares.filter((p) => p.id.startsWith('osm-'));
  if (doOsm.length === 0) return;
  cidadesConferidas.add(cidade.cityKey);
  const doBanco = await buscarLugaresFirestore(cidade);
  // A consulta traz até 300: com isso a cidade já está no catálogo
  if (doBanco.length >= 300) return;
  const noBanco = new Set(doBanco.map((p) => p.id));
  const faltam = doOsm.filter((p) => !noBanco.has(p.id));
  if (faltam.length === 0) return;
  const gravados = await salvarLugaresFirestore(faltam, cidade);
  // Sem login ou sem rede: tenta de novo na próxima vez que a tela abrir
  if (gravados === 0) cidadesConferidas.delete(cidade.cityKey);
}

/** Busca lugares da coleção `places` no Firestore para a cidade dada. */
async function buscarLugaresFirestore(cidade: CidadeAtual): Promise<Place[]> {
  try {
    // Sem orderBy para não exigir índice composto — ordena em memória depois
    const q = query(
      collection(db, 'places'),
      where('cityKey', '==', cidade.cityKey),
      limit(300),
    );
    const snap = await getDocs(q);
    const places = snap.docs.map((d) => d.data() as Place);
    return places.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  } catch {
    return [];
  }
}

/** Restaurantes, cafés, padarias e bares da cidade, do mais perto ao mais longe do ponto dela. */
export async function carregarLugaresDaCidade(cidade: CidadeAtual, forcar = false): Promise<Place[]> {
  const guardados = lugaresGuardados(cidade);
  if (guardados && !forcar && lugaresGuardadosValidos(cidade)) {
    // A lista veio do aparelho; o catálogo do app pode ainda não ter esses lugares
    void completarCatalogo(cidade, guardados).catch(() => {});
    return guardados;
  }

  // Tenta o Firestore primeiro; cai no OSM se a cidade não foi importada
  const doFirestore = await buscarLugaresFirestore(cidade);
  let lista: Place[];
  if (doFirestore.length >= 5) {
    lista = doFirestore;
  } else {
    // Raio maior (15 km) para cobrir cidades médias e grandes; o cache de 24h amortiza o custo
    const encontrados = await buscarRestaurantesReaisOSM(cidade.lat, cidade.lng, 8000);
    const daCidade: Place[] = encontrados
      .filter((p) => !p.id.startsWith('nom-'))
      .map((p) => ({ ...p, cityName: p.cityName ?? cidade.nome, cityKey: cidade.cityKey }));
    lista = daCidade.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    // Salva no Firestore em segundo plano para que a próxima visita (de qualquer usuário) seja instantânea
    // Só os que ainda não existem: lugar já gravado não é reescrito pelo app
    if (daCidade.length > 0) void completarCatalogo(cidade, daCidade).catch(() => {});
  }

  if (lista.length === 0) return guardados ?? [];
  cachePlaces(lista);
  try {
    localStorage.setItem(LS_LUGARES_CIDADE + cidade.cityKey, JSON.stringify({ em: Date.now(), lugares: lista }));
  } catch {}
  return lista;
}
