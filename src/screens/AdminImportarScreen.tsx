import React, { useState } from 'react';
import { ArrowLeft, MapPin, Store, CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Place } from '../types';

// Cidades disponíveis para importação
const CIDADES = [
  { nome: 'São José dos Campos - SP', cityKey: 'sao-jose-dos-campos-sp', lat: -23.1896, lng: -45.8841, state: 'SP' },
  { nome: 'Campinas - SP', cityKey: 'campinas-sp', lat: -22.9056, lng: -47.0608, state: 'SP' },
  { nome: 'São Paulo - SP', cityKey: 'sao-paulo-sp', lat: -23.5505, lng: -46.6333, state: 'SP' },
];

const RAIO_METROS = 12000;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const COZINHAS: Record<string, string> = {
  pizza: 'Pizzaria', burger: 'Hambúrguer', japanese: 'Japonesa', sushi: 'Japonesa',
  italian: 'Italiana', brazilian: 'Brasileira', regional: 'Regional', chinese: 'Chinesa',
  steak_house: 'Carnes', barbecue: 'Churrasco', seafood: 'Frutos do mar',
  coffee_shop: 'Café', ice_cream: 'Sorvete', bakery: 'Padaria', vegetarian: 'Vegetariana',
  vegan: 'Vegana', sandwich: 'Lanches', kebab: 'Árabe', pasta: 'Italiana',
};

function traduzirCozinha(cuisine: string): string {
  const key = cuisine.split(';')[0]?.trim().toLowerCase() ?? '';
  return COZINHAS[key] ?? '';
}

function sim(v?: string): boolean | undefined {
  return v === 'yes' ? true : v === 'no' ? false : undefined;
}

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

function limparSite(tags: Record<string, string>): string | undefined {
  const u = tags.website || tags['contact:website'];
  if (!u) return undefined;
  const t = u.trim().split(';')[0];
  if (/instagram\.com/i.test(t)) return undefined;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function limparInstagram(tags: Record<string, string>): string | undefined {
  const v = tags['contact:instagram'] || tags.instagram;
  if (!v) return undefined;
  const m = v.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]{2,30})\/?$/);
  return m ? m[1] : undefined;
}

function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function normalizarTipo(amenity: string, shop: string, cuisine: string): Place['tipo'] {
  if (amenity === 'cafe' || cuisine.includes('coffee')) return 'cafe';
  if (amenity === 'bakery' || shop === 'bakery' || shop === 'pastry') return 'bakery';
  if (amenity === 'bar' || amenity === 'pub') return 'bar';
  return 'restaurant';
}

async function buscarOverpass(lat: number, lng: number, raio: number): Promise<any[]> {
  const consulta = `[out:json][timeout:60];(
    node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${raio},${lat},${lng});
    node["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${raio},${lat},${lng});
    way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten)$"]["name"](around:${raio},${lat},${lng});
    way["shop"~"^(bakery|pastry|coffee|confectionery)$"]["name"](around:${raio},${lat},${lng});
  );out center 500;`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 58000);
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(consulta)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json = await res.json();
      if ((json.elements ?? []).length > 0) return json.elements;
    } catch (err) {
      console.warn(`Mirror ${mirror} falhou:`, err);
    }
  }
  throw new Error('OpenStreetMap indisponível. Tente novamente em alguns minutos.');
}

function elementoParaLugar(el: any, cidade: typeof CIDADES[0]): Place | null {
  const tags = el.tags || {};
  const nome = tags.name?.trim();
  if (!nome || nome.length < 2) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const rua = tags['addr:street'] || '';
  const num = tags['addr:housenumber'] || '';
  const bairro = tags['addr:suburb'] || tags['addr:neighbourhood'] || '';
  const cidadeNome = tags['addr:city'] || cidade.nome.split(' - ')[0];
  const endereco = [rua ? `${rua}${num ? ', ' + num : ''}` : '', bairro, cidadeNome]
    .filter(Boolean).join(' - ') || cidadeNome;

  const amenity = tags.amenity || '';
  const shop = tags.shop || '';
  const cuisine = tags.cuisine || '';

  return {
    id: `osm-${el.id}`,
    name: nome,
    address: endereco,
    lat,
    lng,
    tipo: normalizarTipo(amenity, shop, cuisine),
    cuisine: traduzirCozinha(cuisine) || undefined,
    bairro: bairro || undefined,
    cityKey: cidade.cityKey,
    cityName: cidade.nome,
    state: cidade.state,
    phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || undefined,
    horario: tags.opening_hours || undefined,
    site: limparSite(tags),
    instagram: limparInstagram(tags),
    servicos: servicosOSM(tags),
    distanceKm: calcularDistancia(cidade.lat, cidade.lng, lat, lng),
    claimed: false,
    source: 'openstreetmap',
    createdAt: Date.now(),
  };
}

type Estado = 'inicial' | 'buscando' | 'revisao' | 'importando' | 'concluido' | 'erro';

interface Props {
  onVoltar: () => void;
}

export default function AdminImportarScreen({ onVoltar }: Props) {
  const [cidadeSelecionada, setCidadeSelecionada] = useState(CIDADES[0]);
  const [estado, setEstado] = useState<Estado>('inicial');
  const [erro, setErro] = useState('');
  const [lugaresEncontrados, setLugaresEncontrados] = useState<Place[]>([]);
  const [jaExistem, setJaExistem] = useState(0);
  const [importados, setImportados] = useState(0);

  const buscar = async () => {
    setEstado('buscando');
    setErro('');
    try {
      const elementos = await buscarOverpass(cidadeSelecionada.lat, cidadeSelecionada.lng, RAIO_METROS);
      const lugares: Place[] = [];
      const vistos = new Set<string>();
      for (const el of elementos) {
        const lugar = elementoParaLugar(el, cidadeSelecionada);
        if (!lugar || vistos.has(lugar.id)) continue;
        vistos.add(lugar.id);
        lugares.push(lugar);
      }

      // Verificar quais já existem no Firestore
      let existentes = 0;
      if (isFirebaseConfigured) {
        try {
          const snap = await getDocs(
            query(collection(db, 'places'), where('cityKey', '==', cidadeSelecionada.cityKey))
          );
          const idsExistentes = new Set(snap.docs.map((d) => d.id));
          existentes = lugares.filter((l) => idsExistentes.has(l.id)).length;
        } catch {}
      }

      setJaExistem(existentes);
      setLugaresEncontrados(lugares.filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i));
      setEstado('revisao');
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar estabelecimentos');
      setEstado('erro');
    }
  };

  const importar = async () => {
    if (!isFirebaseConfigured) {
      setErro('Firebase não configurado. Faça login com uma conta real para importar.');
      setEstado('erro');
      return;
    }
    setEstado('importando');
    setErro('');

    try {
      // Verificar existentes novamente antes de gravar
      const snap = await getDocs(
        query(collection(db, 'places'), where('cityKey', '==', cidadeSelecionada.cityKey))
      );
      const idsExistentes = new Set(snap.docs.map((d) => d.id));
      const novos = lugaresEncontrados.filter((l) => !idsExistentes.has(l.id));

      // Gravar em batches de 400 (limite do Firestore é 500)
      let contador = 0;
      for (let i = 0; i < novos.length; i += 400) {
        const lote = novos.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const lugar of lote) {
          const ref = doc(collection(db, 'places'), lugar.id);
          // Remover campos undefined (Firestore rejeita)
          const dados = JSON.parse(JSON.stringify(lugar));
          batch.set(ref, dados, { merge: false });
        }
        await batch.commit();
        contador += lote.length;
      }

      setImportados(contador);
      setEstado('concluido');
    } catch (err: any) {
      setErro(err.message || 'Erro ao importar para o banco');
      setEstado('erro');
    }
  };

  const novos = lugaresEncontrados.length - jaExistem;
  const tiposCount = lugaresEncontrados.reduce<Record<string, number>>((acc, l) => {
    const t = l.tipo || 'restaurant';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--line)] flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--line)] transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display font-700 text-base leading-tight">Importar estabelecimentos</h1>
          <p className="text-xs text-[var(--muted)]">Fonte: OpenStreetMap</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Seleção de cidade */}
        {(estado === 'inicial' || estado === 'erro') && (
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cidade</label>
              <div className="space-y-2">
                {CIDADES.map((c) => (
                  <button
                    key={c.cityKey}
                    type="button"
                    onClick={() => setCidadeSelecionada(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      cidadeSelecionada.cityKey === c.cityKey
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--line)] hover:border-[var(--ink)]/30'
                    }`}
                  >
                    <MapPin size={16} className={cidadeSelecionada.cityKey === c.cityKey ? 'text-[var(--primary)]' : 'text-[var(--muted)]'} />
                    <span className="text-sm font-medium">{c.nome}</span>
                  </button>
                ))}
              </div>
            </div>

            {erro && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="button"
              onClick={buscar}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-medium text-sm transition-opacity hover:opacity-80 cursor-pointer"
            >
              <Search size={16} />
              Buscar estabelecimentos
            </button>
          </section>
        )}

        {/* Buscando */}
        {estado === 'buscando' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
            <div>
              <p className="font-medium">Buscando em {cidadeSelecionada.nome}...</p>
              <p className="text-sm text-[var(--muted)] mt-1">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}

        {/* Revisão */}
        {estado === 'revisao' && (
          <section className="space-y-5">
            <div className="p-4 rounded-xl border border-[var(--line)] space-y-3">
              <h2 className="font-display font-700 text-base">{cidadeSelecionada.nome}</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-[var(--line)]/40">
                  <p className="text-2xl font-bold">{lugaresEncontrados.length}</p>
                  <p className="text-xs text-[var(--muted)]">encontrados</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--line)]/40">
                  <p className="text-2xl font-bold text-green-600">{novos}</p>
                  <p className="text-xs text-[var(--muted)]">novos</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--line)]/40">
                  <p className="text-2xl font-bold text-[var(--muted)]">{jaExistem}</p>
                  <p className="text-xs text-[var(--muted)]">já existem</p>
                </div>
              </div>

              {/* Por tipo */}
              <div className="space-y-1">
                {Object.entries(tiposCount).sort(([,a],[,b]) => b - a).map(([tipo, qtd]) => (
                  <div key={tipo} className="flex justify-between text-sm">
                    <span className="text-[var(--muted)] capitalize">{
                      tipo === 'restaurant' ? 'Restaurante' :
                      tipo === 'cafe' ? 'Café' :
                      tipo === 'bakery' ? 'Padaria' :
                      tipo === 'bar' ? 'Bar' : tipo
                    }</span>
                    <span className="font-medium tabular">{qtd}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de amostra */}
            <div>
              <p className="text-sm font-medium mb-2">Primeiros 20 estabelecimentos</p>
              <div className="space-y-2">
                {lugaresEncontrados.slice(0, 20).map((l) => (
                  <div key={l.id} className="flex items-start gap-3 py-2 border-b border-[var(--line)]">
                    <Store size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{l.address}</p>
                    </div>
                  </div>
                ))}
                {lugaresEncontrados.length > 20 && (
                  <p className="text-sm text-[var(--muted)] text-center py-2">
                    e mais {lugaresEncontrados.length - 20} estabelecimentos...
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={importar}
                disabled={novos === 0}
                className="w-full py-3 px-4 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-medium text-sm disabled:opacity-40 cursor-pointer hover:opacity-80 transition-opacity"
              >
                Importar {novos} estabelecimento{novos !== 1 ? 's' : ''} para o VIMO
              </button>
              <button
                type="button"
                onClick={() => setEstado('inicial')}
                className="w-full py-3 px-4 rounded-xl border border-[var(--line)] text-sm cursor-pointer hover:bg-[var(--line)]/30 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {/* Importando */}
        {estado === 'importando' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
            <div>
              <p className="font-medium">Importando para o VIMO...</p>
              <p className="text-sm text-[var(--muted)] mt-1">Gravando {novos} estabelecimentos no banco</p>
            </div>
          </div>
        )}

        {/* Concluído */}
        {estado === 'concluido' && (
          <div className="flex flex-col items-center gap-5 py-12 text-center">
            <CheckCircle size={48} className="text-green-500" />
            <div>
              <p className="font-display font-700 text-lg">{importados} estabelecimentos importados</p>
              <p className="text-sm text-[var(--muted)] mt-1">{cidadeSelecionada.nome} está pronta no VIMO</p>
            </div>
            <button
              type="button"
              onClick={onVoltar}
              className="py-3 px-6 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-medium text-sm cursor-pointer hover:opacity-80 transition-opacity"
            >
              Voltar ao app
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
