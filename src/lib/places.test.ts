import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de módulos que dependem de browser/Firebase
vi.mock('./firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  query: vi.fn(),
  orderBy: vi.fn(),
  startAt: vi.fn(),
  endAt: vi.fn(),
  limit: vi.fn(),
}));

// localStorage simulado
const lsStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => lsStore[k] ?? null,
  setItem: (k: string, v: string) => { lsStore[k] = v; },
  removeItem: (k: string) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import {
  calcularDistanciaKm,
  slug,
  extrairBairro,
  formatarPrecoLabel,
  obterFotoTematica,
  cidadeDoLugar,
  cachePlace,
  cachePlaces,
  MEMORY_PLACES_CACHE,
  SAMPLE_PLACES,
  criarLugarUsuario,
  buscarLugaresLocais,
  searchPlaces,
  autocomplete,
  autocompleteCidade,
} from './places';

// ─── calcularDistanciaKm ───────────────────────────────────────────────────

describe('calcularDistanciaKm', () => {
  it('retorna 0 para o mesmo ponto', () => {
    expect(calcularDistanciaKm(-23.5, -46.6, -23.5, -46.6)).toBe(0);
  });

  it('calcula distância entre São Paulo e Rio (~360 km pelas coordenadas centrais)', () => {
    const d = calcularDistanciaKm(-23.55, -46.63, -22.91, -43.17);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(450);
  });

  it('retorna valor simétrico (A→B == B→A)', () => {
    const d1 = calcularDistanciaKm(-23.5, -46.6, -22.9, -43.2);
    const d2 = calcularDistanciaKm(-22.9, -43.2, -23.5, -46.6);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
  });
});

// ─── slug ─────────────────────────────────────────────────────────────────

describe('slug', () => {
  it('converte para kebab-case ASCII', () => {
    expect(slug('São Paulo')).toBe('sao-paulo');
  });

  it('remove acentos e cedilha', () => {
    expect(slug('Café & Pão de Açúcar')).toBe('cafe-pao-de-acucar');
  });

  it('não deixa hífens no início nem no fim', () => {
    const s = slug('--olá--');
    expect(s.startsWith('-')).toBe(false);
    expect(s.endsWith('-')).toBe(false);
  });

  it('letras maiúsculas viram minúsculas', () => {
    expect(slug('RESTAURANTE')).toBe('restaurante');
  });
});

// ─── extrairBairro ────────────────────────────────────────────────────────

describe('extrairBairro', () => {
  it('extrai bairro do padrão "Rua X - Bairro, Cidade"', () => {
    expect(extrairBairro('Rua dos Pinheiros, 10 - Pinheiros, São Paulo - SP')).toBe('Pinheiros');
  });

  it('retorna Centro para endereço vazio', () => {
    expect(extrairBairro('')).toBe('Centro');
  });

  it('reconhece Vila Madalena por substring', () => {
    expect(extrairBairro('Rua X - Vila Madalena, SP')).toBe('Vila Madalena');
  });

  it('retorna Centro como fallback', () => {
    expect(extrairBairro('Rua Desconhecida, 999')).toBe('Centro');
  });
});

// ─── formatarPrecoLabel ───────────────────────────────────────────────────

describe('formatarPrecoLabel', () => {
  it('converte PRICE_LEVEL_INEXPENSIVE → $', () => {
    expect(formatarPrecoLabel('PRICE_LEVEL_INEXPENSIVE')).toBe('$');
  });

  it('converte símbolo direto $$ → $$', () => {
    expect(formatarPrecoLabel('$$')).toBe('$$');
  });

  it('retorna $$ como padrão para valor desconhecido', () => {
    expect(formatarPrecoLabel(undefined)).toBe('$$');
    expect(formatarPrecoLabel('OUTRO')).toBe('$$');
  });

  it('converte PRICE_LEVEL_VERY_EXPENSIVE → $$$$', () => {
    expect(formatarPrecoLabel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe('$$$$');
  });
});

// ─── obterFotoTematica ────────────────────────────────────────────────────

describe('obterFotoTematica', () => {
  it('retorna URL Unsplash para pizza', () => {
    const url = obterFotoTematica('Pizza do Forno', 'restaurant');
    expect(url).toContain('unsplash.com');
    expect(url).toContain('1513104890138'); // pizza photo id
  });

  it('retorna URL de café para tipo cafe', () => {
    const url = obterFotoTematica('', 'cafe');
    expect(url).toContain('1501339847302');
  });

  it('retorna URL de padaria para tipo bakery', () => {
    const url = obterFotoTematica('', 'bakery');
    expect(url).toContain('1509440159596');
  });

  it('retorna URL genérica para tipo desconhecido', () => {
    const url = obterFotoTematica('', 'restaurant');
    expect(url).toContain('unsplash.com');
  });
});

// ─── cidadeDoLugar ────────────────────────────────────────────────────────

describe('cidadeDoLugar', () => {
  it('extrai cidade e UF dos components do Google', () => {
    const components = [
      { types: ['administrative_area_level_2'], longText: 'São Paulo' },
      { types: ['administrative_area_level_1'], shortText: 'SP' },
    ];
    const { cityName, cityKey } = cidadeDoLugar(components);
    expect(cityName).toBe('São Paulo - SP');
    expect(cityKey).toBe('sao-paulo-sp');
  });

  it('retorna strings vazias para array vazio', () => {
    const { cityName, cityKey } = cidadeDoLugar([]);
    expect(cityName).toBe('');
    expect(cityKey).toBe('');
  });

  it('usa locality quando administrative_area_level_2 não existe', () => {
    const { cityName } = cidadeDoLugar([
      { types: ['locality'], longText: 'Campinas' },
    ]);
    expect(cityName).toContain('Campinas');
  });
});

// ─── cachePlace / cachePlaces / MEMORY_PLACES_CACHE ───────────────────────

describe('cachePlace e MEMORY_PLACES_CACHE', () => {
  beforeEach(() => {
    MEMORY_PLACES_CACHE.clear();
    localStorageMock.clear();
  });

  it('cachePlace adiciona ao mapa em memória', () => {
    const p = { id: 'test-001', name: 'Teste', address: '', lat: 0, lng: 0 } as any;
    cachePlace(p);
    expect(MEMORY_PLACES_CACHE.get('test-001')).toStrictEqual(p);
  });

  it('cachePlace ignora lugar sem id', () => {
    cachePlace({ name: 'sem id' } as any);
    expect(MEMORY_PLACES_CACHE.size).toBe(0);
  });

  it('cachePlaces persiste lugares osm- no localStorage', () => {
    const lugares = [
      { id: 'osm-111', name: 'OSM Café', address: '', lat: 0, lng: 0 } as any,
      { id: 'nom-222', name: 'Nom Bar', address: '', lat: 0, lng: 0 } as any,
    ];
    cachePlaces(lugares);
    const guardado = JSON.parse(lsStore['vimo_lugares_cache_v1'] || '{}');
    expect(guardado['osm-111']).toBeDefined();
    expect(guardado['nom-222']).toBeDefined();
  });

  it('cachePlaces não persiste lugares que não são osm-/nom-', () => {
    cachePlaces([{ id: 'chIJf-place-01', name: 'Sample', address: '', lat: 0, lng: 0 } as any]);
    const guardado = JSON.parse(lsStore['vimo_lugares_cache_v1'] || '{}');
    expect(Object.keys(guardado).length).toBe(0);
  });
});

// ─── criarLugarUsuario ────────────────────────────────────────────────────

describe('criarLugarUsuario', () => {
  beforeEach(() => {
    MEMORY_PLACES_CACHE.clear();
    localStorageMock.clear();
  });

  it('cria lugar com prefixo user-', async () => {
    const lugar = await criarLugarUsuario({ nome: 'Meu Bistrô', tipo: 'restaurant' });
    expect(lugar.id).toMatch(/^user-\d+/);
    expect(lugar.name).toBe('Meu Bistrô');
    expect(lugar.tipo).toBe('restaurant');
  });

  it('persiste no localStorage imediatamente', async () => {
    const lugar = await criarLugarUsuario({ nome: 'Café Novo', tipo: 'cafe', bairro: 'Centro' });
    const guardado = JSON.parse(lsStore['vimo_lugares_cache_v1'] || '{}');
    expect(guardado[lugar.id]).toBeDefined();
    expect(guardado[lugar.id].name).toBe('Café Novo');
    expect(guardado[lugar.id].bairro).toBe('Centro');
  });

  it('armazena no cache em memória', async () => {
    const lugar = await criarLugarUsuario({ nome: 'Padaria X', tipo: 'bakery' });
    expect(MEMORY_PLACES_CACHE.get(lugar.id)).toStrictEqual(lugar);
  });

  it('marca verificacao como verifying', async () => {
    const lugar = await criarLugarUsuario({ nome: 'Bar Y', tipo: 'bar' });
    expect(lugar.verificacao).toBe('verifying');
    expect(lugar.source).toBe('user_submitted');
  });

  it('inclui endereco e submittedBy quando fornecidos', async () => {
    const lugar = await criarLugarUsuario({
      nome: 'Restaurante Z',
      tipo: 'restaurant',
      endereco: 'Rua ABC, 100',
      submittedBy: 'uid123',
    });
    expect(lugar.address).toBe('Rua ABC, 100');
    expect(lugar.submittedBy).toBe('uid123');
  });
});

// ─── SAMPLE_PLACES ────────────────────────────────────────────────────────

describe('SAMPLE_PLACES', () => {
  it('tem pelo menos 10 lugares', () => {
    expect(SAMPLE_PLACES.length).toBeGreaterThanOrEqual(10);
  });

  it('todos têm id, name, lat e lng', () => {
    for (const p of SAMPLE_PLACES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(typeof p.lat).toBe('number');
      expect(typeof p.lng).toBe('number');
    }
  });

  it('todos têm tipo válido', () => {
    const tipos = ['restaurant', 'cafe', 'bakery', 'bar'];
    for (const p of SAMPLE_PLACES) {
      expect(tipos).toContain(p.tipo);
    }
  });
});

// ─── searchPlaces (sem chave API) ─────────────────────────────────────────

describe('searchPlaces sem chave API', () => {
  beforeEach(() => {
    MEMORY_PLACES_CACHE.clear();
    // Mock fetch para Nominatim
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as any;
  });

  it('filtra SAMPLE_PLACES por nome quando Nominatim não retorna resultados', async () => {
    const resultados = await searchPlaces('padaria');
    // Nominatim retorna vazio (mock), cai no filtro do SAMPLE_PLACES
    expect(Array.isArray(resultados)).toBe(true);
  });

  it('retorna array vazio para busca sem correspondência', async () => {
    const resultados = await searchPlaces('xyzabcnaoexiste123');
    expect(resultados).toHaveLength(0);
  });
});

// ─── autocomplete sem chave API ───────────────────────────────────────────

describe('autocomplete sem chave API', () => {
  it('filtra SAMPLE_PLACES por nome', async () => {
    const sugestoes = await autocomplete('torra');
    expect(sugestoes.length).toBeGreaterThanOrEqual(1);
    expect(sugestoes[0].placeId).toBeTruthy();
    expect(sugestoes[0].texto).toBeTruthy();
  });

  it('retorna array vazio para query sem match', async () => {
    const sugestoes = await autocomplete('xyzquenaoexiste');
    expect(sugestoes).toHaveLength(0);
  });
});

// ─── autocompleteCidade sem chave API ────────────────────────────────────

describe('autocompleteCidade sem chave API', () => {
  it('retorna cidades que contêm o texto buscado', async () => {
    const cidades = await autocompleteCidade('são paulo');
    expect(cidades.length).toBeGreaterThanOrEqual(1);
    expect(cidades[0].cityKey).toBe('sao-paulo-sp');
  });

  it('retorna cityKey para cada resultado', async () => {
    const cidades = await autocompleteCidade('porto');
    for (const c of cidades) {
      expect(c.cityKey).toBeTruthy();
      expect(c.placeId).toBeTruthy();
      expect(c.texto).toBeTruthy();
    }
  });

  it('retorna array vazio para cidade desconhecida', async () => {
    const cidades = await autocompleteCidade('cidadequeNaoExisteXYZ');
    expect(cidades).toHaveLength(0);
  });
});

// ─── buscarLugaresLocais ──────────────────────────────────────────────────

describe('buscarLugaresLocais', () => {
  beforeEach(() => {
    MEMORY_PLACES_CACHE.clear();
    localStorageMock.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
  });

  it('retorna array vazio para query vazia', async () => {
    const resultados = await buscarLugaresLocais('');
    expect(resultados).toHaveLength(0);
  });

  it('encontra lugares no cache em memória', async () => {
    const p = { id: 'osm-999', name: 'Bistrô do Cache', address: '', lat: 0, lng: 0 } as any;
    cachePlace(p);
    const resultados = await buscarLugaresLocais('bistrô do cache');
    expect(resultados.some((r) => r.id === 'osm-999')).toBe(true);
  });
});
