// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Crosshair,
  ChevronDown,
  LayoutGrid,
  Circle,
  CheckCircle2,
  Star,
  Bookmark,
  Compass,
  X,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  initGoogleMaps,
  isGoogleMapsConfigured,
} from '../lib/googleMaps';
import { obterLocalizacaoRealComFallback, monitorarLocalizacao } from '../lib/geolocation';
import { buscarProximos, searchPlaces, calcularDistanciaKm } from '../lib/places';
import { estaNaWishlist, alternarWishlist } from '../lib/wishlist';
import type { Place } from '../types';
import PlacePlaceholder from './PlacePlaceholder';

type FiltroColecao =
  | 'todos'
  | 'nao_visitados'
  | 'visitado'
  | 'quero_ir'
  | 'salvos';

const ROTULOS_FILTRO: Record<FiltroColecao, string> = {
  todos: 'Mostrar tudo',
  nao_visitados: 'Não visitados',
  visitado: 'Visitado',
  quero_ir: 'Quero ir',
  salvos: 'Só os meus salvos',
};

export default function MapaView({ onAbrirLugar, userId = '' }: { onAbrirLugar: (p: Place) => void; userId?: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const gmapRef = useRef<google.maps.Map | null>(null);
  const gmapUserMarkerRef = useRef<any>(null);
  const gmapMarkersRef = useRef<any[]>([]);

  const [mapaInicializado, setMapaInicializado] = useState(false);
  const [carregandoMapa, setCarregandoMapa] = useState(true);
  const [erroMapa, setErroMapa] = useState<string | null>(null);

  const [lugares, setLugares] = useState<Place[]>([]);
  const [selecionado, setSelecionado] = useState<Place | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroColecao, setFiltroColecao] = useState<FiltroColecao>('todos');
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);
  const [obtendoGps, setObtendoGps] = useState(false);
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Posição inicial (São Paulo antes do GPS)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({
    lat: -23.561684,
    lng: -46.682371,
  });

  // Atualizar Wishlist
  useEffect(() => {
    const map: Record<string, boolean> = {};
    lugares.forEach((p) => {
      if (estaNaWishlist(userId, p.id)) map[p.id] = true;
    });
    setWishlistMap(map);
  }, [lugares]);

  const handleAlternarWishlist = async (e: React.MouseEvent, p: Place) => {
    e.stopPropagation();
    const res = await alternarWishlist(userId, p);
    setWishlistMap((prev) => ({ ...prev, [p.id]: res.added }));
    setToastMsg(res.added ? `${p.name} salvo na Lista de Desejos!` : 'Removido da Lista de Desejos');
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Buscar restaurantes e estabelecimentos próximos
  const carregarRestaurantes = async (lat: number, lng: number) => {
    try {
      const lista = await buscarProximos(lat, lng, 3500);
      const listaComDistancia = lista
        .map((p) => ({
          ...p,
          distanceKm: calcularDistanciaKm(lat, lng, p.lat, p.lng),
        }))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      setLugares(listaComDistancia);
    } catch (err) {
      console.warn('Erro ao carregar restaurantes próximos:', err);
    }
  };

  // Inicializar o Google Maps
  useEffect(() => {
    let montado = true;

    async function montarMapa() {
      try {
        setCarregandoMapa(true);
        setErroMapa(null);

        const g = await initGoogleMaps();
        if (!montado || !mapContainerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');

        const map = new g.maps.Map(mapContainerRef.current, {
          center: { lat: userPos.lat, lng: userPos.lng },
          zoom: 15,
          mapId: 'GARFO_MAP_ID',
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });

        gmapRef.current = map;
        setMapaInicializado(true);
        setCarregandoMapa(false);

        // Atualiza marcador de usuário
        atualizarMarcadorUsuarioGoogle(userPos);
        carregarRestaurantes(userPos.lat, userPos.lng);
      } catch (err: any) {
        if (!montado) return;
        setCarregandoMapa(false);
        setErroMapa(err?.message || 'Não foi possível carregar o Google Maps.');
      }
    }

    montarMapa();

    return () => {
      montado = false;
      gmapMarkersRef.current.forEach((m) => {
        if ('map' in m) m.map = null;
        if ('setMap' in m) m.setMap(null);
      });
      gmapMarkersRef.current = [];
    };
  }, []);

  const atualizarMarcadorUsuarioGoogle = (pos: { lat: number; lng: number }) => {
    const map = gmapRef.current;
    if (!map || !(window as any).google?.maps) return;
    const g = (window as any).google;

    if (gmapUserMarkerRef.current) {
      if ('map' in gmapUserMarkerRef.current) gmapUserMarkerRef.current.map = null;
      if ('setMap' in gmapUserMarkerRef.current) gmapUserMarkerRef.current.setMap(null);
      gmapUserMarkerRef.current = null;
    }

    const dot = document.createElement('div');
    dot.className = 'relative flex items-center justify-center';
    dot.innerHTML = `
      <div class="absolute w-6 h-6 rounded-full bg-amber-500/25 animate-ping"></div>
      <div class="w-3.5 h-3.5 rounded-full bg-[#F5B800] border-2 border-white shadow-md"></div>
    `;

    if (g.maps.marker?.AdvancedMarkerElement) {
      gmapUserMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: pos.lat, lng: pos.lng },
        content: dot,
        title: 'Sua localização atual',
      });
    } else {
      gmapUserMarkerRef.current = new g.maps.Marker({
        map,
        position: { lat: pos.lat, lng: pos.lng },
        title: 'Sua localização atual',
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#F5B800',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
    }
  };

  // Monitorar GPS e atualizar localização do usuário
  useEffect(() => {
    obterLocalizacaoRealComFallback()
      .then((pos) => {
        setUserPos(pos);
        if (gmapRef.current) {
          gmapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
          atualizarMarcadorUsuarioGoogle(pos);
        }
        carregarRestaurantes(pos.lat, pos.lng);
      })
      .catch(() => {});

    const cancelMonitor = monitorarLocalizacao((pos) => {
      setUserPos(pos);
      if (gmapRef.current) {
        atualizarMarcadorUsuarioGoogle(pos);
      }
    });

    return () => cancelMonitor();
  }, []);

  // Centralizar no GPS
  const centralizarNoGps = async () => {
    setObtendoGps(true);
    try {
      const pos = await obterLocalizacaoRealComFallback();
      setUserPos(pos);
      if (gmapRef.current) {
        gmapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
        gmapRef.current.setZoom(16);
        atualizarMarcadorUsuarioGoogle(pos);
      }
      carregarRestaurantes(pos.lat, pos.lng);
    } catch {
      // Ignora erro de gps
    } finally {
      setObtendoGps(false);
    }
  };

  // Buscar lugares por texto
  const handleBusca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busca.trim()) return;

    try {
      const res = await searchPlaces(busca, { lat: userPos.lat, lng: userPos.lng });
      if (res.length > 0) {
        const resComDist = res.map((p) => ({
          ...p,
          distanceKm: calcularDistanciaKm(userPos.lat, userPos.lng, p.lat, p.lng),
        }));
        setLugares(resComDist);
        setSelecionado(resComDist[0]);

        if (gmapRef.current) {
          gmapRef.current.panTo({ lat: resComDist[0].lat, lng: resComDist[0].lng });
        }
      }
    } catch (err) {
      console.warn('Erro ao pesquisar:', err);
    }
  };

  // Atualizar marcadores no mapa
  useEffect(() => {
    if (!mapaInicializado || !gmapRef.current || !(window as any).google?.maps) return;
    const g = (window as any).google;
    const map = gmapRef.current;

    // Limpar marcadores anteriores
    gmapMarkersRef.current.forEach((m) => {
      if ('map' in m) m.map = null;
      if ('setMap' in m) m.setMap(null);
    });
    gmapMarkersRef.current = [];

    lugares.forEach((p) => {
      const isSel = selecionado?.id === p.id;
      const ratingTxt = p.rating ? p.rating.toFixed(1).replace('.', ',') : '–';

      const pinEl = document.createElement('div');
      pinEl.className = 'cursor-pointer';
      pinEl.innerHTML = `
        <div class="relative flex flex-col items-center transition-transform duration-200 -translate-x-1/2 -translate-y-full">
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs font-semibold backdrop-blur-md border ${
            isSel
              ? 'bg-[#171717] text-[#F5B800] border-[#F5B800] ring-4 ring-[#F5B800]/30 shadow-xl scale-110'
              : 'bg-white text-[#171717] border-[#EAEAEA] shadow-md hover:scale-105 hover:border-[#F5B800]'
          }">
            <span class="font-bold text-[11px] max-w-[85px] truncate">${p.name}</span>
            <span class="text-[12px] text-[#F5B800] font-black">★${ratingTxt}</span>
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 rounded-[1px] shadow-xs ${isSel ? 'bg-[#171717]' : 'bg-white'}"></div>
        </div>
      `;

      pinEl.onclick = () => {
        setSelecionado(p);
        map.panTo({ lat: p.lat, lng: p.lng });
      };

      if (g.maps.marker?.AdvancedMarkerElement) {
        const marker = new g.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: p.lat, lng: p.lng },
          content: pinEl,
          title: p.name,
          zIndex: isSel ? 999 : 1,
        });
        gmapMarkersRef.current.push(marker);
      } else {
        const marker = new g.maps.Marker({
          map,
          position: { lat: p.lat, lng: p.lng },
          title: p.name,
          zIndex: isSel ? 999 : 1,
        });
        marker.addListener('click', () => {
          setSelecionado(p);
          map.panTo({ lat: p.lat, lng: p.lng });
        });
        gmapMarkersRef.current.push(marker);
      }
    });
  }, [lugares, selecionado, mapaInicializado]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F8F8F6] dark:bg-[#111113]">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#171717] px-5 py-2 text-xs font-bold text-white shadow-2xl flex items-center gap-2 border border-[#F5B800]/40 animate-in fade-in slide-in-from-top-4">
          <Bookmark size={14} className="fill-[#F5B800] text-[#F5B800]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Container do Google Maps */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Loading Overlay */}
      {carregandoMapa && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F8F8F6]/80 dark:bg-[#111113]/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-[#18181B] shadow-md border border-gray-200 dark:border-neutral-800">
            <RefreshCw size={22} className="text-[#F5B800] animate-spin" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Carregando Google Maps...
            </span>
          </div>
        </div>
      )}

      {/* Erro Overlay */}
      {erroMapa && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F8F8F6] dark:bg-[#111113] p-6 text-center">
          <div className="max-w-sm p-6 rounded-3xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-neutral-800 shadow-md">
            <AlertCircle size={32} className="text-[#F5B800] mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              Google Maps Indisponível
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{erroMapa}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-[#F5B800] text-[#171717] text-xs font-bold hover:bg-[#E0A800] transition active:scale-95"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Header Superior Flutuante */}
      <div className="absolute top-4 inset-x-4 z-10 flex flex-col gap-2 pointer-events-none">
        <form
          onSubmit={handleBusca}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 dark:bg-[#18181B]/95 p-1.5 shadow-md border border-gray-200/80 dark:border-neutral-800"
        >
          <div className="flex flex-1 items-center gap-2 pl-3">
            <Search size={16} className="text-[#F5B800]" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar restaurantes ou pratos no mapa..."
              className="w-full bg-transparent text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none font-medium"
            />
          </div>
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-[#F5B800] px-4 py-2 text-xs font-bold text-[#171717] hover:bg-[#E0A800] transition active:scale-95"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Botão de Localização do Usuário */}
      <button
        type="button"
        onClick={centralizarNoGps}
        className="absolute top-20 right-4 z-10 h-10 w-10 rounded-2xl bg-white/95 dark:bg-[#18181B]/95 shadow-md border border-gray-200/80 dark:border-neutral-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-[#F5B800] hover:text-[#171717] transition active:scale-95"
        title="Centralizar na minha localização"
      >
        <Crosshair size={18} className={obtendoGps ? 'animate-spin text-[#F5B800]' : ''} />
      </button>

      {/* Bottom Sheet do Restaurante Selecionado */}
      {selecionado && (
        <div className="absolute bottom-24 inset-x-4 z-10 animate-in slide-in-from-bottom duration-200">
          <div
            onClick={() => onAbrirLugar(selecionado)}
            className="flex items-center gap-3.5 rounded-[24px] bg-white dark:bg-[#18181B] p-3.5 shadow-xl border border-gray-200/80 dark:border-neutral-800 cursor-pointer hover:border-[#F5B800] transition"
          >
            {/* Foto */}
            <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-neutral-800">
              {selecionado.photoUrl ? (
                <img
                  src={selecionado.photoUrl}
                  alt={selecionado.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <PlacePlaceholder name={selecionado.name} className="h-full w-full" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                {selecionado.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {selecionado.address}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-[#F5B800] flex items-center gap-0.5">
                  <Star size={12} className="fill-[#F5B800]" />
                  {selecionado.rating ? selecionado.rating.toFixed(1) : '–'}
                </span>
                {selecionado.distanceKm !== undefined && (
                  <span className="text-[11px] text-gray-400 font-medium">
                    &bull; {selecionado.distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => handleAlternarWishlist(e, selecionado)}
                className="p-2 rounded-full bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:text-[#F5B800]"
                title="Salvar"
              >
                <Bookmark
                  size={16}
                  className={wishlistMap[selecionado.id] ? 'fill-[#F5B800] text-[#F5B800]' : ''}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
