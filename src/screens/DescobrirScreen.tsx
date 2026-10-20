import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, ChevronRight, Star } from 'lucide-react';
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

const CATEGORIAS = [
  { id: 'todos', label: 'Todos' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'bakery', label: 'Padarias' },
  { id: 'bar', label: 'Bares' },
  { id: 'restaurant', label: 'Restaurantes' },
];

const REGIOES = [
  'Próximo de você',
  'Vila Olímpia',
  'Itaim Bibi',
  'Pinheiros',
  'Jardins',
  'Moema',
  'Vila Madalena',
];

const OCASIOES = [
  { label: 'Encontro romântico', tipo: 'restaurant' },
  { label: 'Com amigos', tipo: 'bar' },
  { label: 'Família', tipo: 'restaurant' },
  { label: 'Happy hour', tipo: 'bar' },
];

function getContextoHorario() {
  const h = new Date().getHours();
  if (h < 11) return [{ label: 'Café da manhã', tipo: 'cafe' }, { label: 'Padaria', tipo: 'bakery' }];
  if (h < 15) return [{ label: 'Almoço', tipo: 'restaurant' }, { label: 'Cafés', tipo: 'cafe' }];
  if (h < 18) return [{ label: 'Cafés', tipo: 'cafe' }, { label: 'Lanche', tipo: 'bakery' }];
  if (h < 22) return [{ label: 'Jantar', tipo: 'restaurant' }, { label: 'Drinks', tipo: 'bar' }];
  return [{ label: 'Drinks', tipo: 'bar' }, { label: 'Jantar', tipo: 'restaurant' }];
}

function tipoLabel(tipo: string) {
  if (tipo === 'cafe') return 'Cafeteria';
  if (tipo === 'bakery') return 'Padaria';
  if (tipo === 'bar') return 'Bar';
  return 'Restaurante';
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

function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <div className={`shrink-0 ${wide ? 'w-44' : 'w-36'} rounded-xl overflow-hidden bg-s2 animate-pulse`}>
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
  wide?: boolean;
}

function PlaceCard({ place, distancia, onClick, wide }: PlaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 ${wide ? 'w-44' : 'w-36'} rounded-xl overflow-hidden bg-s1 ring-1 ring-line text-left transition-transform active:scale-95 cursor-pointer`}
    >
      <PlaceImage
        src={place.photoUrl ?? ''}
        name={place.name}
        className="h-24 w-full"
        showName={!place.photoUrl}
      />
      <div className="p-2.5">
        <p className="text-[12.5px] font-semibold text-ink leading-snug line-clamp-2">{place.name}</p>
        <p className="text-[11px] text-muted mt-0.5 truncate">{tipoLabel(place.tipo ?? '')}</p>
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

interface RankCardProps {
  rank: number;
  place: Place;
  avaliacoes: number;
  onClick: () => void;
}

function RankCard({ rank, place, avaliacoes, onClick }: RankCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b border-line last:border-0 text-left cursor-pointer active:opacity-70 transition-opacity"
    >
      <span className="text-[22px] font-black text-muted/40 w-7 shrink-0 text-center leading-none tabular-nums">{rank}</span>
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-s2">
        <PlaceImage src={place.photoUrl ?? ''} name={place.name} className="w-full h-full" showName={false} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink leading-snug line-clamp-1">{place.name}</p>
        <p className="text-[11px] text-muted mt-0.5">{tipoLabel(place.tipo ?? '')}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-muted">{avaliacoes} avaliações</p>
      </div>
    </button>
  );
}

interface OcasiaoCardProps {
  label: string;
  place?: Place;
  onClick: () => void;
}

function OcasiaoCard({ label, place, onClick }: OcasiaoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-28 rounded-xl overflow-hidden flex-1 min-w-0 cursor-pointer active:scale-95 transition-transform"
    >
      {place?.photoUrl != null ? (
        <img src={place.photoUrl} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-s3" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <p className="absolute bottom-2.5 left-3 right-3 text-[12.5px] font-semibold text-white leading-snug text-left">{label}</p>
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

  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');

  const [lugaresPerto, setLugaresPerto] = useState<Place[]>([]);
  const [carregandoPerto, setCarregandoPerto] = useState(true);

  const [reviewsAmigos, setReviewsAmigos] = useState<Review[]>([]);
  const [carregandoAmigos, setCarregandoAmigos] = useState(true);

  const coordsCarregadasRef = useRef(false);

  const lugaresFiltrados = categoriaSelecionada === 'todos'
    ? SAMPLE_PLACES
    : SAMPLE_PLACES.filter((p) => p.tipo === categoriaSelecionada);

  const lugaresTendencia = SAMPLE_PLACES.slice(0, 5);
  const contextHorario = getContextoHorario();
  const lugaresParaHoje = contextHorario.map((ctx) => ({
    ctx,
    places: SAMPLE_PLACES.filter((p) => p.tipo === ctx.tipo).slice(0, 4),
  }));

  const lugaresOcasiao = OCASIOES.map((oc) => ({
    ...oc,
    place: SAMPLE_PLACES.find((p) => p.tipo === oc.tipo),
  }));

  const lugaresNovidades = SAMPLE_PLACES.slice(5, 12);

  const heroPrincipal = SAMPLE_PLACES[0];

  useEffect(() => {
    solicitarLocalizacaoAtual()
      .then((loc) => setCoords(loc))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (coordsCarregadasRef.current) return;
    coordsCarregadasRef.current = true;
    setCarregandoPerto(true);
    buscarProximos(coords.lat, coords.lng, 2500)
      .then((lugares) => setLugaresPerto(lugares.slice(0, 10)))
      .catch(() => setLugaresPerto(SAMPLE_PLACES.slice(0, 8)))
      .finally(() => setCarregandoPerto(false));
  }, [coords.lat, coords.lng]);

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
        <div className="flex items-center justify-between mb-3">
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
        {/* Filtros de categoria */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaSelecionada(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
                categoriaSelecionada === cat.id
                  ? 'bg-ink text-bg border-ink'
                  : 'bg-transparent text-ink border-line hover:border-ink/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 pt-6">

        {/* Hero — Em alta */}
        {heroPrincipal && (
          <section className="px-4">
            <button
              type="button"
              onClick={() => onAbrirLugar(heroPrincipal)}
              className="w-full rounded-2xl overflow-hidden relative h-52 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <PlaceImage
                src={heroPrincipal.photoUrl ?? ''}
                name={heroPrincipal.name}
                className="w-full h-full"
                showName={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Em alta
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-lg leading-tight line-clamp-1">{heroPrincipal.name}</p>
                <p className="text-white/75 text-[12.5px] mt-0.5">{tipoLabel(heroPrincipal.tipo ?? '')}</p>
              </div>
            </button>
          </section>
        )}

        {/* Perto de você */}
        <section>
          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="t-section text-base font-semibold text-ink">Perto de você</h2>
            <button
              type="button"
              onClick={() => {}}
              className="flex items-center gap-0.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Ver mapa <ChevronRight size={14} />
            </button>
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

        {/* Em alta na VIMO — ranking */}
        <section>
          <div className="px-4 mb-1 flex items-center justify-between">
            <h2 className="t-section text-base font-semibold text-ink">Em alta na Vimo</h2>
          </div>
          <div className="px-4">
            {lugaresTendencia.map((p, i) => (
              <RankCard
                key={p.id}
                rank={i + 1}
                place={p}
                avaliacoes={Math.max(3, 18 - i * 3)}
                onClick={() => onAbrirLugar(p)}
              />
            ))}
          </div>
        </section>

        {/* Para hoje */}
        {lugaresParaHoje.map(({ ctx, places }) =>
          places.length > 0 ? (
            <section key={ctx.label}>
              <div className="px-4 mb-3 flex items-center justify-between">
                <h2 className="t-section text-base font-semibold text-ink">Para hoje — {ctx.label}</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
                {places.map((p) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    wide
                    onClick={() => onAbrirLugar(p)}
                  />
                ))}
              </div>
            </section>
          ) : null
        )}

        {/* Explorar por ocasião */}
        <section>
          <div className="px-4 mb-3">
            <h2 className="t-section text-base font-semibold text-ink">Explorar por ocasião</h2>
          </div>
          <div className="px-4 grid grid-cols-2 gap-2.5">
            {lugaresOcasiao.map((oc) => (
              <OcasiaoCard
                key={oc.label}
                label={oc.label}
                place={oc.place}
                onClick={() => oc.place && onAbrirLugar(oc.place)}
              />
            ))}
          </div>
        </section>

        {/* Explorar por região */}
        <section>
          <div className="px-4 mb-3">
            <h2 className="t-section text-base font-semibold text-ink">Explorar por região</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
            {REGIOES.map((regiao) => (
              <button
                key={regiao}
                type="button"
                onClick={() => {}}
                className="shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold border border-line text-ink hover:border-ink/50 transition-colors cursor-pointer bg-s1"
              >
                {regiao}
              </button>
            ))}
          </div>
        </section>

        {/* Novidades na sua região */}
        <section>
          <div className="px-4 mb-3">
            <h2 className="t-section text-base font-semibold text-ink">Novidades na sua região</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {lugaresNovidades.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                onClick={() => onAbrirLugar(p)}
              />
            ))}
          </div>
        </section>

        {/* Amigos foram */}
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

      </div>
    </div>
  );
}
