import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Compass,
  Search,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import type { FsqNormalizedPlace } from '../../types/foursquare';
import { searchNearbyRestaurants, geocodeWithOpenStreetMap } from '../../services/foursquare/places';
import { solicitarLocalizacaoAtual, obterCoordenadasSalvas } from '../../services/locationService';
import FsqPlaceCard from './FsqPlaceCard';

interface FsqEmAltaSectionProps {
  onAbrirLugar?: (place: any) => void;
}

export default function FsqEmAltaSection({ onAbrirLugar }: FsqEmAltaSectionProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number; displayName?: string } | null>(() =>
    obterCoordenadasSalvas()
  );
  const [lugares, setLugares] = useState<FsqNormalizedPlace[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusErro, setStatusErro] = useState<
    'nenhum' | 'localizacao_negada' | 'api_key_missing' | 'api_error' | 'sem_resultados'
  >('nenhum');
  const [mensagemErro, setMensagemErro] = useState('');
  const [enderecoManual, setEnderecoManual] = useState('');
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);

  // 1. Obtém geolocalização do usuário
  useEffect(() => {
    let ativo = true;

    async function initGps() {
      setCarregando(true);
      setStatusErro('nenhum');

      try {
        const local = await solicitarLocalizacaoAtual();
        if (ativo) {
          setCoords(local);
        }
      } catch (err: any) {
        if (!ativo) return;
        const salvas = obterCoordenadasSalvas();
        if (salvas) {
          setCoords(salvas);
        } else {
          setStatusErro('localizacao_negada');
          setMensagemErro(
            'Permita o acesso à sua localização para encontrar restaurantes perto de você (raio de até 20 km).'
          );
        }
        setCarregando(false);
      }
    }

    initGps();

    return () => {
      ativo = false;
    };
  }, []);

  // 2. Busca estabelecimentos reais na Foursquare Places API
  useEffect(() => {
    if (!coords) return;

    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setStatusErro('nenhum');

      const res = await searchNearbyRestaurants(coords!.lat, coords!.lng, 15000);

      if (!ativo) return;
      setCarregando(false);

      if (res.places.length > 0) {
        setLugares(res.places);
        return;
      }

      if (res.code === 'API_ERROR' || res.code === 'NETWORK_ERROR') {
        setStatusErro('api_error');
        setMensagemErro(res.error || 'Não foi possível carregar os estabelecimentos. Tente novamente.');
        setLugares([]);
        return;
      }

      if (res.code === 'ZERO_RESULTS' || res.places.length === 0) {
        setStatusErro('sem_resultados');
        setLugares([]);
        return;
      }

      setLugares(res.places);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [coords]);

  // Recarregar via GPS
  const recarregarGPS = async () => {
    setCarregando(true);
    setStatusErro('nenhum');
    try {
      const novas = await solicitarLocalizacaoAtual();
      setCoords(novas);
    } catch {
      setCarregando(false);
      setStatusErro('localizacao_negada');
      setMensagemErro(
        'Permita o acesso à sua localização para encontrar restaurantes perto de você.'
      );
    }
  };

  // Buscar endereço manual via OpenStreetMap Nominatim
  const handleBuscarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enderecoManual.trim()) return;

    setBuscandoEndereco(true);
    try {
      const geo = await geocodeWithOpenStreetMap(enderecoManual);
      if (geo) {
        setCoords({
          lat: geo.lat,
          lng: geo.lng,
          displayName: geo.displayName,
        });
        setStatusErro('nenhum');
      } else {
        alert('Localização não encontrada pelo OpenStreetMap.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao buscar localização.');
    } finally {
      setBuscandoEndereco(false);
    }
  };

  return (
    <section className="pt-5 pb-3">
      {/* Título e Subtítulo Conforme Seção 6 da Especificação */}
      <div className="flex items-center justify-between px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-gray-950 dark:text-white leading-none">
              Em alta perto de você
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
              Restaurantes e lugares próximos à sua localização
            </p>
          </div>
        </div>

        {coords && (
          <button
            type="button"
            onClick={recarregarGPS}
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 transition"
            title="Atualizar localização"
          >
            <RotateCcw size={11} className={carregando ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        )}
      </div>

      {/* Indicador de Localização Ativa */}
      {coords?.displayName && (
        <div className="px-4 pb-2 text-[11px] text-gray-500 flex items-center gap-1">
          <MapPin size={12} className="text-amber-500 shrink-0" />
          <span className="truncate">Perto de: {coords.displayName}</span>
        </div>
      )}

      {/* ESTADO: Carregando (Skeleton Cards) */}
      {carregando && (
        <div className="flex gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="w-[240px] sm:w-[260px] shrink-0 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse"
            >
              <div className="h-36 bg-gray-100 dark:bg-neutral-800" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded-md w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded-md w-1/2" />
                <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded-md w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ESTADO: Localização Negada */}
      {!carregando && statusErro === 'localizacao_negada' && (
        <div className="mx-4 my-2 p-4 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-start gap-2.5">
            <Compass size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-950 dark:text-white">
                Permita o acesso à sua localização
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Permita o acesso à sua localização para encontrar restaurantes perto de você (raio de até 20 km), ou pesquise sua cidade/endereço abaixo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={recarregarGPS}
              className="h-9 px-4 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs hover:bg-amber-600 transition flex items-center justify-center gap-1.5"
            >
              <Compass size={13} />
              <span>Autorizar Localização</span>
            </button>

            {/* Input para Endereço Manual com OpenStreetMap */}
            <form onSubmit={handleBuscarManual} className="flex-1 flex gap-1.5">
              <input
                type="text"
                value={enderecoManual}
                onChange={(e) => setEnderecoManual(e.target.value)}
                placeholder="Ex: Pinheiros, São Paulo ou Copacabana, RJ"
                className="flex-1 h-9 px-3 rounded-xl bg-gray-100 dark:bg-neutral-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={buscandoEndereco || !enderecoManual.trim()}
                className="h-9 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-1"
              >
                <Search size={12} />
                <span>{buscandoEndereco ? '...' : 'Buscar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ESTADO: Chave Foursquare Não Configurada */}
      {!carregando && statusErro === 'api_key_missing' && (
        <div className="mx-4 my-2 p-4.5 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-950 dark:text-white">
                Foursquare Places API
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Configure sua chave da Foursquare Places API para carregar estabelecimentos reais.
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                Adicione a variável <code className="font-sans text-amber-600 bg-amber-50 dark:bg-neutral-800 px-1 py-0.5 rounded">FOURSQUARE_API_KEY</code> no arquivo <code className="font-sans text-gray-700 dark:text-gray-300">.env</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO: Erro da API */}
      {!carregando && statusErro === 'api_error' && (
        <div className="mx-4 my-2 p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Erro ao carregar estabelecimentos
              </h4>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                Não foi possível carregar os estabelecimentos. Tente novamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={recarregarGPS}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ESTADO: Nenhum Resultado */}
      {!carregando && statusErro === 'sem_resultados' && (
        <div className="mx-4 my-2 p-5 rounded-3xl bg-white dark:bg-[#18181B] text-center space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Não encontramos restaurantes nessa região.
          </p>
          <p className="text-[11px] text-gray-400">
            Não foram localizados estabelecimentos no raio de 20 km desta localização.
          </p>
        </div>
      )}

      {/* ESTADO: Lista Horizontal de Restaurantes Reais da Foursquare */}
      {!carregando && statusErro === 'nenhum' && lugares.length > 0 && (
        <div className="flex gap-3.5 overflow-x-auto px-4 py-2 no-scrollbar snap-x snap-mandatory">
          {lugares.map((p) => (
            <FsqPlaceCard
              key={p.id}
              place={p}
              layout="horizontal"
              onClick={() => {
                if (onAbrirLugar) {
                  onAbrirLugar({
                    id: p.id,
                    name: p.name,
                    address: p.address || p.shortAddress,
                    photoUrl: p.primaryPhoto || p.photos?.[0],
                    rating: p.rating5 || 0,
                    reviewsCount: p.ratingsCount || 0,
                    lat: p.lat,
                    lng: p.lng,
                    tipo: p.category,
                  });
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
