import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, ChevronRight } from 'lucide-react';
import { Avatar, PlaceImage } from '../components/ui';
import { solicitarLocalizacaoAtual, obterCoordenadasSalvas } from '../services/locationService';
import { buscarProximos, calcularDistanciaKm, SAMPLE_PLACES } from '../lib/places';
import { carregarComunidade } from '../lib/reviews';
import type { Place, Review, UserProfile } from '../types';

interface DescobrirScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (place: Place | string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
}

function tempoRelativo(ts: number): string {
  const d = Date.now() - ts;
  const min = Math.floor(d / 60000);
  if (min < 60) return min < 1 ? 'agora' : `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return dias === 1 ? 'ontem' : `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? '1 mês' : `${meses} meses`;
}

function SkeletonCard() {
  return (
    <div className="shrink-0 w-36 rounded-xl overflow-hidden bg-s2 animate-pulse">
      <div className="h-24 w-full bg-s3" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-3 bg-s3 rounded w-4/5" />
        <div className="h-2.5 bg-s3 rounded w-3/5" />
      </div>
    </div>
  );
}

interface PlaceCardProps {
  place: Place;
  distancia?: string;
  onClick: () => void;
}

function PlaceCard({ place, distancia, onClick }: PlaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-36 rounded-xl overflow-hidden bg-s1 ring-1 ring-line text-left transition-transform active:scale-95 cursor-pointer"
    >
      <PlaceImage
        src={place.photoUrl}
        name={place.name}
        className="h-24 w-full"
        showName={!place.photoUrl}
      />
      <div className="p-2.5">
        <p className="text-[12.5px] font-semibold text-ink leading-snug line-clamp-2">{place.name}</p>
        <p className="text-[11px] text-muted mt-0.5 truncate">
          {place.tipo === 'cafe' ? 'Cafeteria' : place.tipo === 'bakery' ? 'Padaria' : place.tipo === 'bar' ? 'Bar' : 'Restaurante'}
        </p>
        {distancia && (
          <p className="text-[11px] text-muted mt-0.5 flex items-center gap-0.5">
            <MapPin size={10} className="shrink-0" />
            {distancia}
          </p>
        )}
      </div>
    </button>
  );
}

interface ReviewRowProps {
  review: Review;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
}

function ReviewRow({ review, onAbrirLugar, onAbrirPerfil }: ReviewRowProps) {
  return (
    <div className="flex gap-3 py-3 border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => onAbrirPerfil(review.uid)}
        className="shrink-0 cursor-pointer"
        aria-label={`Ver perfil de ${review.authorName}`}
      >
        <Avatar src={review.authorPhoto} name={review.authorName} size={36} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onAbrirPerfil(review.uid)}
            className="text-[13px] font-semibold text-ink hover:underline cursor-pointer"
          >
            {review.authorName}
          </button>
          <span className="text-[11px] text-muted">{tempoRelativo(review.createdAt)}</span>
        </div>
        <button
          type="button"
          onClick={() => onAbrirLugar(review.placeId)}
          className="text-[12.5px] font-medium text-primary hover:underline cursor-pointer leading-snug"
        >
          {review.placeName}
        </button>
        {review.text ? (
          <p className="text-[12px] text-ink-2 mt-0.5 line-clamp-2 leading-snug">{review.text}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function DescobrirScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca,
}: DescobrirScreenProps) {
  const [coords, setCoords] = useState(() => {
    const s = obterCoordenadasSalvas();
    return s || { lat: -23.561684, lng: -46.682371 };
  });

  const [lugaresPerto, setLugaresPerto] = useState<Place[]>([]);
  const [carregandoPerto, setCarregandoPerto] = useState(true);

  const [reviewsAmigos, setReviewsAmigos] = useState<Review[]>([]);
  const [carregandoAmigos, setCarregandoAmigos] = useState(true);

  const lugaresFamosos = SAMPLE_PLACES.slice(0, 8);

  const coordsCarregadasRef = useRef(false);

  // GPS
  useEffect(() => {
    solicitarLocalizacaoAtual()
      .then((loc) => setCoords(loc))
      .catch(() => {});
  }, []);

  // Lugares perto
  useEffect(() => {
    if (coordsCarregadasRef.current) return;
    coordsCarregadasRef.current = true;
    setCarregandoPerto(true);
    buscarProximos(coords.lat, coords.lng, 2500)
      .then((lugares) => setLugaresPerto(lugares.slice(0, 10)))
      .catch(() => setLugaresPerto(SAMPLE_PLACES.slice(0, 8)))
      .finally(() => setCarregandoPerto(false));
  }, [coords.lat, coords.lng]);

  // Reviews dos amigos
  useEffect(() => {
    if (!currentUser.uid) {
      setCarregandoAmigos(false);
      return;
    }
    setCarregandoAmigos(true);
    carregarComunidade(currentUser.uid)
      .then((lista) => setReviewsAmigos(lista.slice(0, 5)))
      .catch(() => setReviewsAmigos([]))
      .finally(() => setCarregandoAmigos(false));
  }, [currentUser.uid]);

  const distanciaFormatada = (p: Place) => {
    const km = calcularDistanciaKm(coords.lat, coords.lng, p.lat, p.lng);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-line px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="t-display text-2xl">Descobrir</h1>
          <button
            type="button"
            onClick={onAbrirBusca}
            aria-label="Buscar"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 text-ink transition-colors cursor-pointer"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="space-y-8 pt-6">
        {/* Seção: Perto de mim */}
        <section>
          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="t-section text-base font-semibold text-ink">Perto de mim</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {carregandoPerto ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : lugaresPerto.length === 0 ? (
              <p className="text-sm text-muted py-2">Nenhum lugar encontrado perto de você.</p>
            ) : (
              lugaresPerto.map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  distancia={distanciaFormatada(p)}
                  onClick={() => onAbrirLugar(p)}
                />
              ))
            )}
          </div>
        </section>

        {/* Seção: Amigos foram */}
        <section>
          <div className="px-4 mb-1 flex items-center justify-between">
            <h2 className="t-section text-base font-semibold text-ink">Amigos foram</h2>
            <button
              type="button"
              onClick={() => {}}
              className="flex items-center gap-0.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Ver todos"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="px-4">
            {carregandoAmigos ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-3 border-b border-line animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-s3 shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-s3 rounded w-1/3" />
                      <div className="h-3 bg-s3 rounded w-2/3" />
                      <div className="h-2.5 bg-s3 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviewsAmigos.length === 0 ? (
              <p className="text-sm text-muted py-2">
                {currentUser.uid
                  ? 'Siga amigos para ver onde eles foram.'
                  : 'Faça login para ver o que seus amigos avaliaram.'}
              </p>
            ) : (
              reviewsAmigos.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={r}
                  onAbrirLugar={onAbrirLugar}
                  onAbrirPerfil={onAbrirPerfil}
                />
              ))
            )}
          </div>
        </section>

        {/* Seção: Em alta no Vimo */}
        <section>
          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="t-section text-base font-semibold text-ink">Em alta no Vimo</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {lugaresFamosos.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                onClick={() => onAbrirLugar(p)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
