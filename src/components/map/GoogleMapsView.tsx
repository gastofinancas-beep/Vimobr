// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { initGoogleMaps } from '../../lib/googleMaps';

export interface MapMoveEventData {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
}

export interface UnifiedPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  rating?: number | null;
  vimoRating?: number | null;
  vimoReviewsCount?: number;
  googleRating?: number | null;
  priceLevel?: string | null;
  distanceFormatted?: string;
  photoUrl?: string;
  rawPlace?: any;
}

export interface GoogleMapsViewRef {
  recenter: (lat?: number, lng?: number) => void;
}

interface GoogleMapsViewProps {
  userLat: number;
  userLng: number;
  places: UnifiedPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: UnifiedPlace | null) => void;
  onMapMoveEnd?: (data: MapMoveEventData) => void;
  className?: string;
}

// Estilo de Mapa Albo / Editorial com Contraste Real e Equilibrado:
// - Fundo levemente acinzentado/creme (#EFECE6 / #EAE6DE), NÃO branco puro.
// - Ruas brancas (#FFFFFF) com bordas bem nítidas (#DBD6CC) para definir cada quarteirão.
// - Avenidas principais destacadas (#CAC4B6).
// - Rodovias com tom âmbar suave (#FFE7B8) e contorno (#D6C298).
// - Parques em verde pastel perceptível (#CCE2C8).
// - Água em azul suave natural (#BBD7F0).
// - Labels de ruas e bairros legíveis em cinza-chumbo (#54524D / #3D3B37).
// - POIs comerciais e institucionais do Google 100% desligados (sem hospitais, lojas, farmácias ou ícones vermelhos).
const ALBO_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // 1. Fundo geral do terreno / landscape com tonalidade quente natural (não-branco)
  {
    elementType: 'geometry',
    stylers: [{ color: '#EFECE6' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#EAE6DE' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#EDE8E0' }],
  },
  // 2. Desativa completamente todos os ícones de POIs comerciais do Google
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // 3. Estilo de texto sutil e legível
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#68655F' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 2.5 }],
  },
  // 4. DESLIGA POIs comerciais, lojas, hospitais, escolas e atrações de terceiros
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.medical',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.school',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.attraction',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.place_of_worship',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.government',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.sports_complex',
    stylers: [{ visibility: 'off' }],
  },
  // 5. Parques e Áreas Verdes: verde pastel visível e agradável
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#CCE2C8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5A7C58' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 2 }],
  },
  // 6. Ruas comuns: brancas com bordas cinza nítidas (delimita os quarteirões urbanos)
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#DBD6CC' }, { weight: 1.2 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6B6862' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 2 }],
  },
  // 7. Avenidas Principais: destacadas com borda mais escura
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CAC4B6' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#54524D' }],
  },
  // 8. Rodovias: tom levemente aquecido/âmbar com borda contrastante
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#FFE7B8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D6C298' }, { weight: 1.8 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#463E32' }],
  },
  // 9. Água / Rios / Lagos: azul pastel visível e bem definido
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#BBD7F0' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C80A6' }],
  },
  // 10. Nomes de Bairros e Regiões importantes
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3D3B37' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#33312D' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#DFDAD0' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  // 11. Desliga trânsito intrusivo
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];

function formatNota(place: UnifiedPlace): string {
  if (place.vimoRating) {
    return place.vimoRating.toFixed(1).replace('.', ',');
  }
  if (place.rating) {
    return place.rating.toFixed(1).replace('.', ',');
  }
  return 'Novo';
}

interface ClusterGroup {
  id: string;
  isCluster: boolean;
  lat: number;
  lng: number;
  places: UnifiedPlace[];
  count: number;
}

const GoogleMapsView = forwardRef<GoogleMapsViewRef, GoogleMapsViewProps>(function GoogleMapsView(
  {
    userLat,
    userLng,
    places,
    selectedPlaceId,
    onSelectPlace,
    onMapMoveEnd,
    className = 'h-full w-full',
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);

  // Fallback Interativo
  const [fallbackOffset, setFallbackOffset] = useState({ x: 0, y: 0 });
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Expor controle de recentralizar
  useImperativeHandle(ref, () => ({
    recenter: (lat = userLat, lng = userLng) => {
      if (mapRef.current && mapLoaded) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(15);
      } else {
        setFallbackOffset({ x: 0, y: 0 });
        setFallbackZoom(1);
      }
    },
  }));

  // Algoritmo de Clustering para evitar sobreposição de pins próximos
  const clusterGroups = useMemo<ClusterGroup[]>(() => {
    if (currentZoom >= 16 || places.length <= 4) {
      return places.map((p) => ({
        id: p.id,
        isCluster: false,
        lat: p.lat,
        lng: p.lng,
        places: [p],
        count: 1,
      }));
    }

    const threshold = currentZoom <= 12 ? 0.035 : currentZoom <= 14 ? 0.009 : 0.0035;
    const groups: ClusterGroup[] = [];

    places.forEach((place) => {
      let matched = false;
      for (const group of groups) {
        const dLat = Math.abs(group.lat - place.lat);
        const dLng = Math.abs(group.lng - place.lng);
        if (dLat < threshold && dLng < threshold) {
          group.places.push(place);
          group.count += 1;
          group.lat = (group.lat * (group.count - 1) + place.lat) / group.count;
          group.lng = (group.lng * (group.count - 1) + place.lng) / group.count;
          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.push({
          id: place.id,
          isCluster: false,
          lat: place.lat,
          lng: place.lng,
          places: [place],
          count: 1,
        });
      }
    });

    return groups.map((g) => {
      if (g.count > 1) {
        return {
          ...g,
          id: `cluster-${g.lat.toFixed(4)}-${g.lng.toFixed(4)}`,
          isCluster: true,
        };
      }
      return g;
    });
  }, [places, currentZoom]);

  // Inicialização do Google Maps sem mapId para aplicar o estilo com contraste e esconder POIs
  useEffect(() => {
    let active = true;

    async function loadMap() {
      if (!containerRef.current) return;

      try {
        const g = await initGoogleMaps();
        if (!active || !containerRef.current) return;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: userLat, lng: userLng },
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          styles: ALBO_MAP_STYLES,
          clickableIcons: false,
        });

        // Ao clicar no fundo do mapa, fecha o card
        map.addListener('click', () => {
          onSelectPlace(null);
        });

        let idleTimer: any = null;
        map.addListener('idle', () => {
          const z = map.getZoom() || 15;
          setCurrentZoom(z);

          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            if (!onMapMoveEnd) return;
            const c = map.getCenter();
            const b = map.getBounds();
            if (c && b) {
              const ne = b.getNorthEast();
              const sw = b.getSouthWest();
              onMapMoveEnd({
                center: { lat: c.lat(), lng: c.lng() },
                zoom: z,
                bounds: {
                  ne: { lat: ne.lat(), lng: ne.lng() },
                  sw: { lat: sw.lat(), lng: sw.lng() },
                },
              });
            }
          }, 300);
        });

        mapRef.current = map;
        setMapLoaded(true);
        setUsingFallback(false);
      } catch (err) {
        if (active) {
          setUsingFallback(true);
          setMapLoaded(false);
        }
      }
    }

    loadMap();

    return () => {
      active = false;
      markersRef.current.forEach((m) => {
        if (m && typeof m.setMap === 'function') m.setMap(null);
      });
      markersRef.current = [];
      if (userMarkerRef.current && typeof userMarkerRef.current.setMap === 'function') {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, []);

  // Marcador de Localização do Usuário via OverlayView
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).google?.maps || !mapLoaded) return;
    const g = (window as any).google;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    const dotEl = document.createElement('div');
    dotEl.className = 'pointer-events-none select-none';
    dotEl.innerHTML = `
      <div style="transform: translate(-50%, -50%);" class="w-3.5 h-3.5 rounded-full bg-[#0066FF] border-2 border-white shadow-xs"></div>
    `;

    class UserDotOverlay extends g.maps.OverlayView {
      div: HTMLElement;
      pos: google.maps.LatLng;
      constructor(pos: { lat: number; lng: number }, div: HTMLElement) {
        super();
        this.pos = new g.maps.LatLng(pos.lat, pos.lng);
        this.div = div;
        this.setMap(map);
      }
      onAdd() {
        this.getPanes()?.overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const p = projection.fromLatLngToDivPixel(this.pos);
        if (p) {
          this.div.style.position = 'absolute';
          this.div.style.left = `${p.x}px`;
          this.div.style.top = `${p.y}px`;
        }
      }
      onRemove() {
        if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
      }
    }

    userMarkerRef.current = new UserDotOverlay({ lat: userLat, lng: userLng }, dotEl);
  }, [userLat, userLng, mapLoaded]);

  // Marcadores dos Restaurantes VIMO e Clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).google?.maps || !mapLoaded) return;
    const g = (window as any).google;

    markersRef.current.forEach((m) => {
      if (m && typeof m.setMap === 'function') m.setMap(null);
    });
    markersRef.current = [];

    class VimoMarkerOverlay extends g.maps.OverlayView {
      div: HTMLElement;
      pos: google.maps.LatLng;
      constructor(pos: { lat: number; lng: number }, div: HTMLElement) {
        super();
        this.pos = new g.maps.LatLng(pos.lat, pos.lng);
        this.div = div;
        this.setMap(map);
      }
      onAdd() {
        this.getPanes()?.overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const p = projection.fromLatLngToDivPixel(this.pos);
        if (p) {
          this.div.style.position = 'absolute';
          this.div.style.left = `${p.x}px`;
          this.div.style.top = `${p.y}px`;
        }
      }
      onRemove() {
        if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
      }
    }

    clusterGroups.forEach((group) => {
      if (group.isCluster) {
        // Cluster Circular Branco e Discreto
        const clusterEl = document.createElement('div');
        clusterEl.className = 'cursor-pointer select-none';
        clusterEl.style.transform = 'translate(-50%, -50%)';
        clusterEl.innerHTML = `
          <div class="h-6 min-w-6 px-1.5 rounded-full bg-white text-gray-800 font-semibold text-[11px] flex items-center justify-center gap-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.12)] border border-gray-200 hover:scale-105 active:scale-95 transition-transform">
            <span class="text-[12px] text-[var(--star)]">●</span>
            <span>${group.count}</span>
          </div>
        `;

        clusterEl.onclick = (e) => {
          e.stopPropagation();
          map.panTo({ lat: group.lat, lng: group.lng });
          map.setZoom((map.getZoom() || 14) + 2);
        };

        const overlay = new VimoMarkerOverlay({ lat: group.lat, lng: group.lng }, clusterEl);
        markersRef.current.push(overlay);
      } else {
        // Pin VIMO Cápsula Pequena (28–34px)
        const place = group.places[0];
        const isSelected = selectedPlaceId === place.id;
        const nota = formatNota(place);

        const pinEl = document.createElement('div');
        pinEl.className = 'cursor-pointer select-none';
        pinEl.style.transform = 'translate(-50%, -100%)';
        pinEl.style.zIndex = isSelected ? '999' : '10';

        pinEl.innerHTML = `
          <div class="relative flex flex-col items-center transition-all duration-200 ${
            isSelected ? 'scale-115' : 'hover:scale-105'
          }">
            <div class="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shadow-[0_2px_6px_rgba(0,0,0,0.12)] border transition-all duration-200 ${
              isSelected
                ? 'bg-[var(--star)] text-white border-[var(--star)] shadow-[0_3px_10px_rgba(245,158,11,0.35)]'
                : 'bg-white text-gray-800 border-gray-200/90 hover:border-gray-300'
            }">
              <span class="text-[12px] ${isSelected ? 'text-white' : 'text-[var(--star)]'} font-bold">★</span>
              <span class="leading-tight">${nota}</span>
            </div>
            <div class="w-1.5 h-1.5 rotate-45 -mt-0.5 shadow-2xs ${
              isSelected ? 'bg-[var(--star)]' : 'bg-white'
            }"></div>
          </div>
        `;

        pinEl.onclick = (e) => {
          e.stopPropagation();
          onSelectPlace(place);
          map.panTo({ lat: place.lat, lng: place.lng });
        };

        const overlay = new VimoMarkerOverlay({ lat: place.lat, lng: place.lng }, pinEl);
        markersRef.current.push(overlay);
      }
    });
  }, [clusterGroups, selectedPlaceId, onSelectPlace, mapLoaded]);

  // Centraliza no restaurante selecionado
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current || !mapLoaded) return;
    const selected = places.find((p) => p.id === selectedPlaceId);
    if (selected) {
      try {
        mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
      } catch {}
    }
  }, [selectedPlaceId, places, mapLoaded]);

  // Gestos para o Fallback Interativo
  const handleFallbackMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - fallbackOffset.x, y: e.clientY - fallbackOffset.y };
  };

  const handleFallbackMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setFallbackOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleFallbackMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleFallbackTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - fallbackOffset.x,
        y: e.touches[0].clientY - fallbackOffset.y,
      };
    }
  };

  const handleFallbackTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    setFallbackOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleFallbackTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Posições dos pins de teste no Fallback
  const fallbackPins = useMemo(() => {
    return places.map((place) => {
      const dx = (place.lng - userLng) * 24000;
      const dy = -(place.lat - userLat) * 24000;
      const isSelected = selectedPlaceId === place.id;
      const nota = formatNota(place);

      return {
        place,
        x: dx,
        y: dy,
        isSelected,
        nota,
      };
    });
  }, [places, userLat, userLng, selectedPlaceId]);

  return (
    <div className={`relative ${className} overflow-hidden bg-[#EFECE6]`}>
      {/* 1. MAPA REAL GOOGLE MAPS COM ESTILO ALBO */}
      <div
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-300 ${
          mapLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. MAPA VETORIAL DE FALLBACK COM TEXTURA CARTOGRÁFICA RICA */}
      {(!mapLoaded || usingFallback) && (
        <div
          onMouseDown={handleFallbackMouseDown}
          onMouseMove={handleFallbackMouseMove}
          onMouseUp={handleFallbackMouseUp}
          onMouseLeave={handleFallbackMouseUp}
          onTouchStart={handleFallbackTouchStart}
          onTouchMove={handleFallbackTouchMove}
          onTouchEnd={handleFallbackTouchEnd}
          onClick={() => onSelectPlace(null)}
          className="absolute inset-0 z-0 bg-[#EFECE6] cursor-grab active:cursor-grabbing select-none overflow-hidden"
        >
          <div
            style={{
              transform: `translate(${fallbackOffset.x}px, ${fallbackOffset.y}px) scale(${fallbackZoom})`,
              transformOrigin: 'center center',
            }}
            className="absolute inset-0 transition-transform duration-75"
          >
            {/* SVG Cartográfico com Quarteirões, Ruas com Contraste, Parques e Rio */}
            <svg
              className="absolute -inset-96 w-[200vw] h-[200vh] pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Quarteirões Urbanos em tom bege-cinza suave */}
              <rect x="-1000" y="-1000" width="4000" height="4000" fill="#EFECE6" />

              {/* Quadras urbanas construídas */}
              <g fill="#EAE6DE" stroke="#DFDAD0" strokeWidth="1">
                <rect x="120" y="240" width="340" height="230" rx="8" />
                <rect x="530" y="240" width="340" height="230" rx="8" />
                <rect x="930" y="240" width="340" height="230" rx="8" />
                <rect x="120" y="530" width="340" height="220" rx="8" />
                <rect x="530" y="530" width="340" height="220" rx="8" />
                <rect x="930" y="530" width="340" height="220" rx="8" />
              </g>

              {/* Parque Ibirapuera / Área Verde em verde pastel perceptível (#CCE2C8) */}
              <rect x="36%" y="22%" width="280" height="200" rx="28" fill="#CCE2C8" stroke="#B8D4B4" strokeWidth="1" />
              <text x="38%" y="26%" fill="#5A7C58" fontSize="11" fontWeight="600" opacity="0.9">
                Parque das Artes
              </text>

              {/* Rio / Lago em azul pastel perceptível (#BBD7F0) */}
              <path
                d="M -100 850 C 300 810, 600 940, 1100 870 C 1400 820, 1700 910, 2200 850 L 2200 920 C 1700 980, 1400 890, 1100 950 C 600 1010, 300 870, -100 910 Z"
                fill="#BBD7F0"
                stroke="#A8CAEA"
                strokeWidth="1.5"
              />
              <text x="800" y="900" fill="#5C80A6" fontSize="11" fontWeight="600" opacity="0.8">
                Rio Central
              </text>

              {/* Rodovia Principal (em tom âmbar suave com bordas visíveis) */}
              <g stroke="#FFE7B8" strokeWidth="26" strokeLinecap="round">
                <line x1="-500" y1="220" x2="2500" y2="220" />
              </g>
              <g stroke="#D6C298" strokeWidth="1.5" strokeLinecap="round">
                <line x1="-500" y1="207" x2="2500" y2="207" />
                <line x1="-500" y1="233" x2="2500" y2="233" />
              </g>

              {/* Vias e Avenidas Brancas com Bordas Cinza Nítidas */}
              <g stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
                <line x1="-500" y1="500" x2="2500" y2="500" />
                <line x1="-500" y1="780" x2="2500" y2="780" />
                <line x1="500" y1="-500" x2="500" y2="2500" />
                <line x1="900" y1="-500" x2="900" y2="2500" />
                <line x1="1300" y1="-500" x2="1300" y2="2500" />
              </g>

              {/* Contornos das Ruas para Destacar Quarteirões */}
              <g stroke="#DBD6CC" strokeWidth="1.2" strokeLinecap="round">
                <line x1="-500" y1="490" x2="2500" y2="490" />
                <line x1="-500" y1="510" x2="2500" y2="510" />
                <line x1="-500" y1="770" x2="2500" y2="770" />
                <line x1="-500" y1="790" x2="2500" y2="790" />
                <line x1="490" y1="-500" x2="490" y2="2500" />
                <line x1="510" y1="-500" x2="510" y2="2500" />
                <line x1="890" y1="-500" x2="890" y2="2500" />
                <line x1="910" y1="-500" x2="910" y2="2500" />
              </g>

              {/* Nomes das Avenidas e Ruas */}
              <text x="520" y="482" fill="#54524D" fontSize="10" fontWeight="600" opacity="0.85">
                Av. Paulista
              </text>
              <text x="920" y="482" fill="#6B6862" fontSize="10" fontWeight="500" opacity="0.8">
                R. Oscar Freire
              </text>
              <text x="520" y="762" fill="#6B6862" fontSize="10" fontWeight="500" opacity="0.8">
                R. Bela Cintra
              </text>
              <text x="700" y="215" fill="#463E32" fontSize="10" fontWeight="600" opacity="0.9">
                Rodovia dos Bandeirantes
              </text>
            </svg>

            {/* PONTO CENTRAL: Localização do Usuário */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#0066FF] border-2 border-white shadow-xs" />
            </div>

            {/* PINS VIMO DOS RESTAURANTES */}
            <div className="absolute top-1/2 left-1/2 pointer-events-none">
              {fallbackPins.map(({ place, x, y, isSelected, nota }) => (
                <div
                  key={place.id}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className="absolute pointer-events-auto"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlace(place);
                    }}
                    className={`relative flex flex-col items-center -translate-x-1/2 -translate-y-full transition-transform duration-200 ${
                      isSelected ? 'scale-115 z-30' : 'hover:scale-105 z-10'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shadow-[0_2px_6px_rgba(0,0,0,0.12)] border transition-all duration-200 ${
                        isSelected
                          ? 'bg-[var(--star)] text-white border-[var(--star)] shadow-[0_3px_10px_rgba(245,158,11,0.35)]'
                          : 'bg-white text-gray-800 border-gray-200/90 hover:border-gray-300'
                      }`}
                    >
                      <span className={`text-[12px] ${isSelected ? 'text-white' : 'text-[var(--star)]'} font-bold`}>★</span>
                      <span className="leading-tight">${nota}</span>
                    </div>
                    <div
                      className={`w-1.5 h-1.5 rotate-45 -mt-0.5 shadow-2xs ${
                        isSelected ? 'bg-[var(--star)]' : 'bg-white'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default GoogleMapsView;
