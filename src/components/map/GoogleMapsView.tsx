import React, { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function categoryEmoji(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('caf') || c.includes('café') || c.includes('cafe')) return '☕';
  if (c.includes('padaria') || c.includes('bakery') || c.includes('pão') || c.includes('pao')) return '🥐';
  if (c.includes('bar') || c.includes('boteco') || c.includes('chopp')) return '🍺';
  if (c.includes('pizza') || c.includes('pizz')) return '🍕';
  if (c.includes('sushi') || c.includes('japon') || c.includes('japonês') || c.includes('ramen')) return '🍣';
  if (c.includes('burger') || c.includes('hamb')) return '🍔';
  if (c.includes('sorvete') || c.includes('ice cream') || c.includes('gelato')) return '🍦';
  if (c.includes('churrasco') || c.includes('churrascaria') || c.includes('steak')) return '🥩';
  if (c.includes('italiana') || c.includes('italian') || c.includes('massa') || c.includes('pasta')) return '🍝';
  if (c.includes('francesa') || c.includes('french') || c.includes('bistrô') || c.includes('bistro')) return '🥐';
  return '🍽️';
}

function createPillIcon(place: UnifiedPlace, selected: boolean): L.DivIcon {
  const emoji = categoryEmoji(place.category);
  const shortName = place.name.length > 20 ? place.name.slice(0, 18) + '…' : place.name;
  const bg = selected ? '#101116' : '#FFFFFF';
  const fg = selected ? '#FFFFFF' : '#101116';
  const fgMuted = selected ? 'rgba(255,255,255,0.60)' : 'rgba(16,17,22,0.45)';
  const iconBg = selected ? 'rgba(255,255,255,0.12)' : '#F3F2EF';
  const scaleCss = selected ? 'transform:translateX(-50%) translateY(-100%) scale(1.08);' : 'transform:translateX(-50%) translateY(-100%);';

  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;left:0;top:0;${scaleCss}
      display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .15s;">
      <div style="display:flex;align-items:center;gap:7px;
        border-radius:14px;padding:5px 11px 5px 5px;
        font-family:Inter,system-ui,sans-serif;white-space:nowrap;
        box-shadow:0 2px 12px rgba(0,0,0,0.18),0 1px 3px rgba(0,0,0,0.10);
        background:${bg};border:1.5px solid ${selected ? 'transparent' : 'rgba(0,0,0,0.06)'};">
        <div style="width:30px;height:30px;border-radius:50%;background:${iconBg};
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;font-size:15px;line-height:1;">${emoji}</div>
        <div style="min-width:0;">
          <div style="font-size:11.5px;font-weight:700;color:${fg};line-height:1.25;">${shortName}</div>
          <div style="font-size:9.5px;font-weight:500;color:${fgMuted};line-height:1.3;">${place.category}</div>
        </div>
      </div>
      <div style="width:8px;height:8px;transform:rotate(45deg);margin-top:-4px;
        background:${bg};box-shadow:${selected ? 'none' : '1px 1px 3px rgba(0,0,0,0.10)'};"></div>
    </div>`,
  });
}

let animStyleInjected = false;
function injectAnimStyle() {
  if (animStyleInjected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = `@keyframes vimo-ping{75%,100%{transform:scale(2.2);opacity:0}}.vimo-ping{animation:vimo-ping 1.5s cubic-bezier(0,0,.2,1) infinite}`;
  document.head.appendChild(s);
  animStyleInjected = true;
}

function createUserDotIcon(): L.DivIcon {
  injectAnimStyle();
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
      <div class="vimo-ping" style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(18,75,255,.2);"></div>
      <div style="width:14px;height:14px;border-radius:50%;background:#124BFF;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);position:relative;z-index:1;"></div>
    </div>`,
  });
}

interface MapControllerProps {
  userLat: number;
  userLng: number;
  places: UnifiedPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: UnifiedPlace | null) => void;
  onMapMoveEnd?: (data: MapMoveEventData) => void;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
}

function MapController({
  userLat, userLng, places, selectedPlaceId, onSelectPlace, onMapMoveEnd, mapInstanceRef,
}: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    mapInstanceRef.current = map;
  }, [map, mapInstanceRef]);

  // Pan para coordenadas do usuário quando mudam (primeira vez que GPS resolve)
  const prevCoordsRef = useRef({ lat: userLat, lng: userLng });
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (prev.lat !== userLat || prev.lng !== userLng) {
      map.flyTo([userLat, userLng], map.getZoom(), { duration: 0.6 });
      prevCoordsRef.current = { lat: userLat, lng: userLng };
    }
  }, [userLat, userLng, map]);

  // Pan para o lugar selecionado
  useEffect(() => {
    if (!selectedPlaceId) return;
    const p = places.find((x) => x.id === selectedPlaceId);
    if (p) map.flyTo([p.lat, p.lng], map.getZoom(), { duration: 0.4 });
  }, [selectedPlaceId, places, map]);

  useMapEvents({
    moveend() {
      if (!onMapMoveEnd) return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      onMapMoveEnd({
        center: { lat: center.lat, lng: center.lng },
        zoom,
        bounds: {
          ne: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
          sw: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
        },
      });
    },
    click() {
      onSelectPlace(null);
    },
  });

  return null;
}

const GoogleMapsView = forwardRef<GoogleMapsViewRef, GoogleMapsViewProps>(
  ({ userLat, userLng, places, selectedPlaceId, onSelectPlace, onMapMoveEnd, className = '' }, ref) => {
    const mapInstanceRef = useRef<L.Map | null>(null);

    useImperativeHandle(ref, () => ({
      recenter(lat?: number, lng?: number) {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.flyTo([lat ?? userLat, lng ?? userLng], map.getZoom(), { duration: 0.6 });
      },
    }));

    const userDotIcon = useMemo(() => createUserDotIcon(), []);

    return (
      <div className={`relative ${className}`} style={{ isolation: 'isolate' }}>
        <MapContainer
          center={[userLat, userLng]}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Tiles CartoDB Voyager — colorido (parques verdes, água azul), gratuito, sem API key */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <MapController
            userLat={userLat}
            userLng={userLng}
            places={places}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
            onMapMoveEnd={onMapMoveEnd}
            mapInstanceRef={mapInstanceRef}
          />

          {/* Ponto do usuário */}
          <Marker position={[userLat, userLng]} icon={userDotIcon} interactive={false} />

          {/* Pins dos lugares */}
          {places.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createPillIcon(place, selectedPlaceId === place.id)}
              zIndexOffset={selectedPlaceId === place.id ? 1000 : 0}
              eventHandlers={{
                click(e) {
                  e.originalEvent.stopPropagation();
                  onSelectPlace(place);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
    );
  }
);

GoogleMapsView.displayName = 'GoogleMapsView';
export default GoogleMapsView;
