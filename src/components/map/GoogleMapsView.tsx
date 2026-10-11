import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  googleUserRatingCount?: number;
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Mapbox style parecido com o mapa do Albo (tons bege/creme, sem POIs externos)
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

function categoryEmoji(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('caf') || c.includes('café')) return '☕';
  if (c.includes('padaria') || c.includes('bakery')) return '🥐';
  if (c.includes('bar')) return '🍺';
  if (c.includes('pizza')) return '🍕';
  if (c.includes('sushi') || c.includes('japon')) return '🍣';
  if (c.includes('burger') || c.includes('hamb')) return '🍔';
  return '🍽️';
}

// Marcador estilo mockup Albo: pílula branca com emoji + nome truncado
function PlaceMarker({
  place,
  selected,
  onClick,
}: {
  place: UnifiedPlace;
  selected: boolean;
  onClick: () => void;
}) {
  const emoji = categoryEmoji(place.category);
  const shortName = place.name.length > 18 ? place.name.slice(0, 16) + '…' : place.name;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex flex-col items-center cursor-pointer group"
      style={{ transform: 'translateY(-100%)' }}
    >
      <div
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.18)] border transition-all duration-150 ${
          selected
            ? 'bg-[#101116] text-white border-[#101116] scale-110'
            : 'bg-white text-[#101116] border-white/80 hover:scale-105'
        }`}
      >
        <span className="text-[13px] leading-none">{emoji}</span>
        <span className="leading-tight whitespace-nowrap">{shortName}</span>
      </div>
      {/* Ponteiro triangular */}
      <div
        className={`w-2 h-2 rotate-45 -mt-[3px] ${selected ? 'bg-[#101116]' : 'bg-white'}`}
        style={{ boxShadow: selected ? 'none' : '1px 1px 2px rgba(0,0,0,0.12)' }}
      />
    </button>
  );
}

// Ponto azul do usuário
function UserDot() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute w-8 h-8 rounded-full bg-[#124BFF]/20 animate-ping" />
      <div className="w-3.5 h-3.5 rounded-full bg-[#124BFF] border-2 border-white shadow-md" />
    </div>
  );
}

// Mapa de fallback (SVG cartográfico) quando não há token Mapbox
function FallbackMap({
  userLat,
  userLng,
  places,
  selectedPlaceId,
  onSelectPlace,
}: Pick<GoogleMapsViewProps, 'userLat' | 'userLng' | 'places' | 'selectedPlaceId' | 'onSelectPlace'>) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const pins = useMemo(() =>
    places.map((p) => ({
      place: p,
      x: (p.lng - userLng) * 24000,
      y: -(p.lat - userLat) * 24000,
    })),
    [places, userLat, userLng]
  );

  return (
    <div
      className="absolute inset-0 bg-[#EFECE6] overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={(e) => { dragging.current = true; dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }}
      onMouseMove={(e) => { if (dragging.current) setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => { if (e.touches.length === 1) { dragging.current = true; dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }; } }}
      onTouchMove={(e) => { if (dragging.current && e.touches.length === 1) setOffset({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y }); }}
      onTouchEnd={() => { dragging.current = false; }}
      onClick={() => onSelectPlace(null)}
    >
      <div
        className="absolute inset-0 transition-transform duration-75"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <svg className="absolute -inset-96 w-[200vw] h-[200vh] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect x="-1000" y="-1000" width="4000" height="4000" fill="#EFECE6" />
          <g fill="#EAE6DE" stroke="#DFDAD0" strokeWidth="1">
            <rect x="120" y="240" width="340" height="230" rx="8" />
            <rect x="530" y="240" width="340" height="230" rx="8" />
            <rect x="930" y="240" width="340" height="230" rx="8" />
            <rect x="120" y="530" width="340" height="220" rx="8" />
            <rect x="530" y="530" width="340" height="220" rx="8" />
            <rect x="930" y="530" width="340" height="220" rx="8" />
          </g>
          <rect x="36%" y="22%" width="280" height="200" rx="28" fill="#CCE2C8" stroke="#B8D4B4" strokeWidth="1" />
          <path d="M -100 850 C 300 810, 600 940, 1100 870 C 1400 820, 1700 910, 2200 850 L 2200 920 C 1700 980, 1400 890, 1100 950 C 600 1010, 300 870, -100 910 Z" fill="#BBD7F0" stroke="#A8CAEA" strokeWidth="1.5" />
          <g stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
            <line x1="-500" y1="500" x2="2500" y2="500" />
            <line x1="-500" y1="780" x2="2500" y2="780" />
            <line x1="500" y1="-500" x2="500" y2="2500" />
            <line x1="900" y1="-500" x2="900" y2="2500" />
          </g>
          <g stroke="#DBD6CC" strokeWidth="1.2">
            <line x1="-500" y1="490" x2="2500" y2="490" />
            <line x1="-500" y1="510" x2="2500" y2="510" />
            <line x1="490" y1="-500" x2="490" y2="2500" />
            <line x1="510" y1="-500" x2="510" y2="2500" />
          </g>
          <text x="520" y="482" fill="#54524D" fontSize="10" fontWeight="600" opacity="0.85">Av. Paulista</text>
          <text x="920" y="482" fill="#6B6862" fontSize="10" fontWeight="500" opacity="0.8">R. Oscar Freire</text>
        </svg>
        {/* Localização do usuário */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <UserDot />
        </div>
        {/* Pins */}
        <div className="absolute top-1/2 left-1/2 pointer-events-none">
          {pins.map(({ place, x, y }) => (
            <div
              key={place.id}
              className="absolute pointer-events-auto"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <PlaceMarker
                place={place}
                selected={selectedPlaceId === place.id}
                onClick={() => onSelectPlace(place)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GoogleMapsView = forwardRef<GoogleMapsViewRef, GoogleMapsViewProps>(
  ({ userLat, userLng, places, selectedPlaceId, onSelectPlace, onMapMoveEnd, className = '' }, ref) => {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({
      longitude: userLng,
      latitude: userLat,
      zoom: 15,
    });

    useImperativeHandle(ref, () => ({
      recenter(lat?: number, lng?: number) {
        const targetLat = lat ?? userLat;
        const targetLng = lng ?? userLng;
        setViewState((v) => ({ ...v, latitude: targetLat, longitude: targetLng }));
        mapRef.current?.flyTo({ center: [targetLng, targetLat], duration: 600 });
      },
    }));

    // Atualiza centro quando as coordenadas do usuário mudam
    useEffect(() => {
      setViewState((v) => ({ ...v, latitude: userLat, longitude: userLng }));
    }, [userLat, userLng]);

    // Pan para o lugar selecionado
    useEffect(() => {
      if (!selectedPlaceId) return;
      const p = places.find((x) => x.id === selectedPlaceId);
      if (p) mapRef.current?.flyTo({ center: [p.lng, p.lat], duration: 400 });
    }, [selectedPlaceId, places]);

    const handleMoveEnd = useCallback(() => {
      if (!onMapMoveEnd || !mapRef.current) return;
      const map = mapRef.current.getMap();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      if (!bounds) return;
      onMapMoveEnd({
        center: { lat: center.lat, lng: center.lng },
        zoom,
        bounds: {
          ne: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
          sw: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
        },
      });
    }, [onMapMoveEnd]);

    if (!MAPBOX_TOKEN) {
      return (
        <div className={`relative ${className}`}>
          <FallbackMap
            userLat={userLat}
            userLng={userLng}
            places={places}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
          />
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
          onMoveEnd={handleMoveEnd}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          onClick={() => onSelectPlace(null)}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          {/* Ponto do usuário */}
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <UserDot />
          </Marker>

          {/* Pins dos lugares */}
          {places.map((place) => (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
              anchor="bottom"
              style={{ zIndex: selectedPlaceId === place.id ? 10 : 1 }}
            >
              <PlaceMarker
                place={place}
                selected={selectedPlaceId === place.id}
                onClick={() => onSelectPlace(place)}
              />
            </Marker>
          ))}
        </Map>
      </div>
    );
  }
);

GoogleMapsView.displayName = 'GoogleMapsView';
export default GoogleMapsView;
