import type { Place } from '../types';
import { API_BASE, SAMPLE_PLACES, buscarRestaurantesReaisOSM, cachePlaces, slug } from './places';

// Cidade do Descobrir: vem do GPS (com autorização) ou da escolha manual.
// Nome da cidade e lugares vêm do OpenStreetMap, gratuito e sem chave.

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

/** Restaurantes, cafés, padarias e bares da cidade, do mais perto ao mais longe do ponto dela. */
export async function carregarLugaresDaCidade(cidade: CidadeAtual, forcar = false): Promise<Place[]> {
  const guardados = lugaresGuardados(cidade);
  if (guardados && !forcar && lugaresGuardadosValidos(cidade)) return guardados;

  // Yelp primeiro (quando o servidor tem a chave); senão, OpenStreetMap
  const daYelp = await lugaresDaYelp(cidade);
  const encontrados = daYelp.length > 0 ? daYelp : await buscarRestaurantesReaisOSM(cidade.lat, cidade.lng, 5000);
  const daCidade: Place[] = encontrados
    .filter((p) => !p.id.startsWith('nom-'))
    .map((p) => ({ ...p, cityName: p.cityName ?? cidade.nome, cityKey: cidade.cityKey }));
  // Exemplos do app que ficam nessa cidade continuam aparecendo junto
  const exemplos = SAMPLE_PLACES.filter((p) => p.cityKey === cidade.cityKey);
  const lista = [...exemplos, ...daCidade.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))];

  if (lista.length === 0) return guardados ?? [];
  cachePlaces(lista);
  try {
    localStorage.setItem(LS_LUGARES_CIDADE + cidade.cityKey, JSON.stringify({ em: Date.now(), lugares: lista }));
  } catch {}
  return lista;
}

async function lugaresDaYelp(cidade: CidadeAtual): Promise<Place[]> {
  try {
    const res = await fetch(`${API_BASE}/api/lugares/perto?lat=${cidade.lat}&lng=${cidade.lng}`, {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const dados = (await res.json()) as { lugares?: Place[] };
    return Array.isArray(dados.lugares) ? dados.lugares : [];
  } catch {
    return [];
  }
}
