import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, MapPin, Navigation, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import { SAMPLE_PLACES, formatarPrecoLabel } from '../lib/places';
import {
  buscarCidades,
  carregarLugaresDaCidade,
  cidadeDasCoordenadas,
  cidadeSalva,
  lugaresGuardados,
  pedirLocalizacao,
  permissaoLocalizacao,
  salvarCidade,
  type CidadeAtual,
  type FalhaLocalizacao,
} from '../lib/localizacao';
import { Mascote } from '../components/Mascote';
import type { Place, UserProfile } from '../types';
import MascotMessage from '../components/MascotMessage';
import { PlaceImage, Logo, btn, chip } from '../components/ui';
import { useEscape } from '../hooks/useEscape';

type TipoRestauranteFiltro =
  | 'todos'
  | 'italiana'
  | 'hamburguer'
  | 'japonesa'
  | 'cafe_padaria'
  | 'bistro'
  | 'carnes'
  | 'bar';

interface DescobrirScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (place: Place | string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
  onAbrirAvaliar?: () => void;
  onMudarTab?: (tab: 'explorar' | 'descobrir' | 'comunidade' | 'perfil') => void;
  tema?: 'dark' | 'light';
  onToggleTema?: () => void;
}

export default function DescobrirScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca: _onAbrirBusca,
  onAbrirAvaliar: _onAbrirAvaliar,
  onMudarTab: _onMudarTab,
  tema: _tema,
  onToggleTema: _onToggleTema,
}: DescobrirScreenProps) {
  const [cidadeAtual, setCidadeAtual] = useState<CidadeAtual>(() => {
    const salva = cidadeSalva();
    if (salva) return salva;
    const padrao = CIDADES_SUGERIDAS.find((c) => c.cityKey === currentUser.homeCityKey) ?? CIDADES_SUGERIDAS[0];
    return padrao;
  });
  const [gps, setGps] = useState<'parado' | 'pedindo' | FalhaLocalizacao>('parado');
  const [lugares, setLugares] = useState<Place[]>(() => lugaresGuardados(cidadeAtual) ?? lugaresDeExemplo(cidadeAtual));
  const [carregandoLugares, setCarregandoLugares] = useState(true);
  const [cidadeModalAberta, setCidadeModalAberta] = useState(false);
  const [buscaCidade, setBuscaCidade] = useState('');
  const [sugestoesCidade, setSugestoesCidade] = useState<CidadeAtual[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);

  const trocarCidade = (c: CidadeAtual) => {
    salvarCidade(c);
    setCidadeAtual(c);
  };

  // Pede a autorização do GPS (o sistema mostra o aviso na primeira vez) e acha a cidade
  const usarLocalizacao = async () => {
    setGps('pedindo');
    try {
      const { lat, lng } = await pedirLocalizacao();
      const cidade = await cidadeDasCoordenadas(lat, lng);
      trocarCidade(cidade);
      setGps('parado');
    } catch (e) {
      setGps(typeof e === 'string' ? (e as FalhaLocalizacao) : 'indisponivel');
    }
  };

  // Primeira vez no Descobrir: pede o GPS. Depois, atualiza sozinho se a pessoa já autorizou.
  const pediuRef = useRef(false);
  useEffect(() => {
    if (pediuRef.current) return;
    pediuRef.current = true;
    const salva = cidadeSalva();
    permissaoLocalizacao().then((estado) => {
      if (estado === 'denied') {
        if (!salva) setGps('negado');
      } else if (!salva || (salva.origem === 'gps' && estado === 'granted')) {
        void usarLocalizacao();
      }
    });
  }, []);

  // Lugares da cidade: mostra o que está guardado e busca a lista atualizada
  useEffect(() => {
    let ativo = true;
    setLugares(lugaresGuardados(cidadeAtual) ?? lugaresDeExemplo(cidadeAtual));
    setCarregandoLugares(true);
    carregarLugaresDaCidade(cidadeAtual)
      .then((lista) => ativo && lista.length > 0 && setLugares(lista))
      .catch(() => {})
      .finally(() => ativo && setCarregandoLugares(false));
    return () => {
      ativo = false;
    };
  }, [cidadeAtual.cityKey, cidadeAtual.lat, cidadeAtual.lng]);

  // Busca de cidade com pausa entre teclas (o serviço gratuito pede no máximo 1 consulta por segundo)
  useEffect(() => {
    const texto = buscaCidade.trim();
    if (texto.length < 3) {
      setSugestoesCidade([]);
      setBuscandoCidade(false);
      return;
    }
    setBuscandoCidade(true);
    const t = setTimeout(() => {
      buscarCidades(texto)
        .then(setSugestoesCidade)
        .catch(() => setSugestoesCidade([]))
        .finally(() => setBuscandoCidade(false));
    }, 700);
    return () => clearTimeout(t);
  }, [buscaCidade]);

  const [filtroTipo, setFiltroTipo] = useState<TipoRestauranteFiltro>('todos');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  useEscape(() => setCidadeModalAberta(false), cidadeModalAberta);

  const lugaresFiltrados = useMemo(() => {
    let list = lugares;

    if (buscaTermo.trim().length > 0) {
      const q = buscaTermo.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.bairro?.toLowerCase().includes(q) ||
          p.tipo?.toLowerCase().includes(q)
      );
    }

    if (filtroTipo !== 'todos') {
      const corpus = (p: Place) =>
        [p.name, p.cuisine, p.category, p.tipo].filter(Boolean).join(' ').toLowerCase();
      const has = (p: Place, ...termos: string[]) => termos.some((t) => corpus(p).includes(t));

      if (filtroTipo === 'italiana') {
        list = list.filter((p) => has(p, 'italiana', 'italian', 'trattoria', 'pizza', 'pasta', 'forno', 'napoletana', 'cantina'));
      } else if (filtroTipo === 'hamburguer') {
        list = list.filter((p) => has(p, 'burger', 'hamburguer', 'hamburger', 'lanche', 'sandwich'));
      } else if (filtroTipo === 'japonesa') {
        list = list.filter((p) => has(p, 'japones', 'japanese', 'sushi', 'omakase', 'ramen', 'temaki', 'izakaya'));
      } else if (filtroTipo === 'cafe_padaria') {
        list = list.filter((p) =>
          p.tipo === 'cafe' || p.tipo === 'bakery' ||
          has(p, 'café', 'cafe', 'coffee', 'padaria', 'panific', 'torra', 'confeitaria', 'croissant', 'espresso')
        );
      } else if (filtroTipo === 'bistro') {
        list = list.filter((p) => has(p, 'bistro', 'bistrô', 'contemporâneo', 'contemporaneo', 'fusion', 'criativo'));
      } else if (filtroTipo === 'carnes') {
        list = list.filter((p) => has(p, 'parrilla', 'churrasco', 'carne', 'steak', 'fogo', 'espeto', 'assado', 'grill'));
      } else if (filtroTipo === 'bar') {
        list = list.filter((p) =>
          p.tipo === 'bar' ||
          has(p, 'bar', 'boteco', 'coquetelaria', 'pub', 'cervej', 'chopp', 'chope', 'craft beer')
        );
      }
    }

    return list;
  }, [filtroTipo, buscaTermo, lugares]);

  const chips: { id: TipoRestauranteFiltro; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'italiana', label: 'Italiana' },
    { id: 'hamburguer', label: 'Hambúrguer' },
    { id: 'japonesa', label: 'Japonesa' },
    { id: 'cafe_padaria', label: 'Cafés e padarias' },
    { id: 'bistro', label: 'Bistrôs' },
    { id: 'carnes', label: 'Carnes' },
    { id: 'bar', label: 'Bares' },
  ];

  const cidadeCurta = cidadeAtual.nome.replace(/\s*-\s*[A-Z]{2}$/, '');
  const limparFiltros = () => {
    setFiltroTipo('todos');
    setBuscaTermo('');
  };

  const TIPOS: Record<string, string> = { restaurant: 'Restaurante', cafe: 'Café', bakery: 'Padaria', bar: 'Bar' };
  const metaDe = (p: Place) =>
    [
      p.cuisine || (p.tipo ? TIPOS[p.tipo] || p.tipo : null),
      cidadeAtual.origem === 'gps' && p.distanceKm != null ? formatarDistancia(p.distanceKm) : p.bairro,
      p.priceLevel ? formatarPrecoLabel(p.priceLevel) : null,
    ]
      .filter(Boolean)
      .join(' · ');

  const populares = useMemo(
    () =>
      // Quem tem avaliação primeiro; empate (lugares sem nota) vai pelo mais perto
      [...lugaresFiltrados].sort((a, b) => {
        const notaA = a.vimoRating ?? a.googleRating ?? 0;
        const notaB = b.vimoRating ?? b.googleRating ?? 0;
        const volA = a.vimoReviewsCount ?? a.googleUserRatingCount ?? a.reviewsCount ?? 0;
        const volB = b.vimoReviewsCount ?? b.googleUserRatingCount ?? b.reviewsCount ?? 0;
        return notaB * Math.log(volB + 1) - notaA * Math.log(volA + 1) || (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
      }),
    [lugaresFiltrados]
  );

  const secoesPorTipo = useMemo(() => {
    const grupos: { titulo: string; tipos: string[] }[] = [
      { titulo: 'Restaurantes', tipos: ['restaurant'] },
      { titulo: 'Cafés e padarias', tipos: ['cafe', 'bakery'] },
      { titulo: 'Bares', tipos: ['bar'] },
    ];
    return grupos
      .map((g) => ({ titulo: g.titulo, lugares: lugaresFiltrados.filter((p) => g.tipos.includes(p.tipo || '')) }))
      .filter((g) => g.lugares.length >= 3);
  }, [lugaresFiltrados]);

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 pt-4 pb-2">
          <Logo altura={24} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCidadeModalAberta(true)}
              aria-label={`Cidade: ${cidadeAtual.nome}. Trocar cidade`}
              className="flex h-9 min-w-0 items-center gap-1 rounded-full bg-s2 pl-3 pr-2.5 text-sm font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer"
            >
              <MapPin size={14} strokeWidth={2} className="shrink-0 text-primary" />
              <span className="truncate max-w-[120px]">{cidadeCurta}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            <NotificationBell
              currentUserUid={currentUser.uid}
              onClick={() => setMostrarNotificacoes(true)}
              className={btn.icon}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3">
          <label className="flex h-12 items-center gap-2.5 rounded-xl bg-s1 px-4 shadow-xs ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-primary transition">
            <Search size={18} strokeWidth={1.9} className="shrink-0 text-muted" />
            <input
              type="search"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar restaurantes, cozinhas…"
              aria-label="Buscar restaurantes"
              className="w-full bg-transparent text-base text-ink placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {buscaTermo && (
              <button
                type="button"
                onClick={() => setBuscaTermo('')}
                aria-label="Limpar busca"
                className="-mr-1 p-1 text-muted hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar px-4">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFiltroTipo(c.id)}
                aria-pressed={filtroTipo === c.id}
                className={chip(filtroTipo === c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto pt-2">
        {gps !== 'parado' && cidadeAtual.origem !== 'gps' && (
          <AvisoLocalizacao estado={gps} onUsar={usarLocalizacao} onEscolher={() => setCidadeModalAberta(true)} />
        )}
        {lugares.length === 0 ? (
          carregandoLugares ? (
            <EsqueletoLugares />
          ) : (
            <MascotMessage
              reaction="pensativo"
              title={`Ainda não achamos lugares em ${cidadeCurta}`}
              subtitle="Confira a conexão ou escolha outra cidade."
              ctaLabel="Trocar cidade"
              onCta={() => setCidadeModalAberta(true)}
            />
          )
        ) : lugaresFiltrados.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={buscaTermo ? `Nada encontrado para "${buscaTermo.trim()}"` : 'Nenhum lugar neste filtro'}
            subtitle="Tente outro nome, bairro ou cozinha."
            ctaLabel="Limpar filtros"
            onCta={limparFiltros}
          />
        ) : buscaTermo || filtroTipo !== 'todos' ? (
          <section className="px-4">
            <CabecalhoSecao titulo={buscaTermo ? 'Resultados' : chips.find((c) => c.id === filtroTipo)?.label || 'Lugares'} total={lugaresFiltrados.length} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              {lugaresFiltrados.map((place) => (
                <Poster key={place.id} place={place} meta={metaDe(place)} onAbrir={onAbrirLugar} />
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-9">
            <section className="px-4">
              <CabecalhoSecao titulo={cidadeAtual.origem === 'gps' ? 'Perto de você' : `Em destaque em ${cidadeCurta}`} total={lugaresFiltrados.length} />
              <div className="grid grid-cols-2 gap-3">
                {populares[0] && (
                  <PosterDestaque place={populares[0]} meta={metaDe(populares[0])} onAbrir={onAbrirLugar} grande />
                )}
                <div className="flex flex-col gap-3">
                  {populares.slice(1, 3).map((place) => (
                    <PosterDestaque key={place.id} place={place} meta={metaDe(place)} onAbrir={onAbrirLugar} />
                  ))}
                </div>
              </div>
            </section>

            {secoesPorTipo.map((sec) => (
              <section key={sec.titulo}>
                <div className="px-4">
                  <CabecalhoSecao titulo={sec.titulo} total={sec.lugares.length} />
                </div>
                <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
                  {sec.lugares.map((place) => (
                    <div key={place.id} className="w-[34%] max-w-[150px] shrink-0 snap-start">
                      <Poster place={place} meta={place.bairro || ''} onAbrir={onAbrirLugar} pequeno />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="px-4">
              <CabecalhoSecao titulo="Todos os lugares" total={lugaresFiltrados.length} />
              <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 lg:grid-cols-5">
                {lugaresFiltrados.map((place) => (
                  <Poster key={place.id} place={place} meta="" onAbrir={onAbrirLugar} pequeno />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {cidadeModalAberta && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setCidadeModalAberta(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cidade-descobrir"
            onClick={(e) => e.stopPropagation()}
            className="animate-in slide-in-from-bottom w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-s1 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-s3 sm:hidden" />
            <div className="flex items-center justify-between pb-3">
              <h3 id="titulo-cidade-descobrir" className="t-section text-ink">Trocar cidade</h3>
              <button type="button" onClick={() => setCidadeModalAberta(false)} aria-label="Fechar" className={btn.icon}>
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCidadeModalAberta(false);
                void usarLocalizacao();
              }}
              className="mb-3 flex w-full items-center gap-3 rounded-lg bg-primary/10 px-3 py-3 text-left cursor-pointer"
            >
              <Navigation size={17} strokeWidth={2} className="shrink-0 text-primary" />
              <span className="flex-1 text-[15px] font-semibold text-primary">Usar minha localização</span>
              {cidadeAtual.origem === 'gps' && <span className="text-xs text-muted">Em uso</span>}
            </button>

            <label className="flex h-11 items-center gap-2.5 rounded-lg bg-s2 px-3 ring-1 ring-transparent focus-within:ring-primary transition">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" />
              <input
                type="text"
                value={buscaCidade}
                onChange={(e) => setBuscaCidade(e.target.value)}
                placeholder="Buscar outra cidade"
                aria-label="Buscar cidade"
                className="w-full bg-transparent text-base text-ink placeholder:text-muted outline-none"
              />
            </label>

            <ul className="mt-2 max-h-64 overflow-y-auto">
              {buscaCidade.trim().length >= 3 && buscandoCidade && (
                <li className="px-2 py-3 text-sm text-muted">Buscando…</li>
              )}
              {buscaCidade.trim().length >= 3 && !buscandoCidade && sugestoesCidade.length === 0 && (
                <li className="px-2 py-3 text-sm text-muted">Nenhuma cidade encontrada</li>
              )}
              {(buscaCidade.trim().length >= 3 ? sugestoesCidade : CIDADES_SUGERIDAS).map((cid) => {
                const atual = cid.cityKey === cidadeAtual.cityKey;
                return (
                  <li key={cid.cityKey}>
                    <button
                      type="button"
                      onClick={() => {
                        trocarCidade({ ...cid, origem: 'manual' });
                        setCidadeModalAberta(false);
                        setBuscaCidade('');
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-base transition-colors hover:bg-s2 cursor-pointer ${
                        atual ? 'font-semibold text-ink' : 'text-ink-2'
                      }`}
                    >
                      <MapPin size={16} strokeWidth={1.8} className={atual ? 'text-primary' : 'text-muted'} />
                      <span>{cid.nome}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(id) => onAbrirLugar(id)}
          onAbrirPerfil={onAbrirPerfil}
        />
      )}
    </div>
  );
}

function CabecalhoSecao({ titulo, total }: { titulo: string; total: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
        <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{titulo}</h2>
      </div>
      <span className="text-xs font-medium text-muted tabular">
        {total} {total === 1 ? 'lugar' : 'lugares'}
      </span>
    </div>
  );
}

function PosterDestaque({
  place,
  meta,
  onAbrir,
  grande = false,
}: {
  place: Place;
  meta: string;
  onAbrir: (p: Place) => void;
  grande?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(place)}
      aria-label={place.name}
      className={`group block w-full text-left cursor-pointer ${grande ? 'h-full' : ''}`}
    >
      <div className={`relative overflow-hidden rounded-xl bg-s2 ring-1 ring-inset ring-black/5 transition-transform duration-200 group-active:scale-[0.98] ${grande ? 'h-full min-h-[200px]' : 'aspect-[4/5]'}`}>
        <PlaceImage
          src={place.photoUrl}
          name={place.name}
          className={`w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${grande ? 'h-full absolute inset-0' : 'h-full'}`}
        />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/35 to-transparent rounded-b-xl pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pointer-events-none">
          <p className="font-bold text-[13px] leading-tight text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            {place.name}
          </p>
          {meta && (
            <p className="mt-0.5 truncate text-[11px] text-white/70 leading-tight">{meta}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function Poster({
  place,
  meta,
  onAbrir,
  pequeno = false,
}: {
  place: Place;
  meta: string;
  onAbrir: (p: Place) => void;
  pequeno?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(place)}
      aria-label={place.name}
      className="group block w-full text-left cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-xl bg-s2 ring-1 ring-inset ring-black/5 transition-transform duration-200 group-active:scale-[0.98]">
        <PlaceImage
          src={place.photoUrl}
          name={place.name}
          className="aspect-[4/5] w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-b-xl pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pointer-events-none">
          <p className={`font-bold leading-tight text-white drop-shadow-sm ${pequeno ? 'text-[11px]' : 'text-[13px]'}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {place.name}
          </p>
          {meta && !pequeno && (
            <p className="mt-0.5 truncate text-[11px] text-white/75 leading-tight">{meta}</p>
          )}
        </div>
      </div>
    </button>
  );
}

const CIDADES_SUGERIDAS: CidadeAtual[] = [
  { cityKey: 'sao-paulo-sp', nome: 'São Paulo - SP', lat: -23.5505, lng: -46.6333, origem: 'manual' },
  { cityKey: 'rio-de-janeiro-rj', nome: 'Rio de Janeiro - RJ', lat: -22.9068, lng: -43.1729, origem: 'manual' },
  { cityKey: 'belo-horizonte-mg', nome: 'Belo Horizonte - MG', lat: -19.9167, lng: -43.9345, origem: 'manual' },
  { cityKey: 'curitiba-pr', nome: 'Curitiba - PR', lat: -25.4284, lng: -49.2733, origem: 'manual' },
  { cityKey: 'porto-alegre-rs', nome: 'Porto Alegre - RS', lat: -30.0346, lng: -51.2177, origem: 'manual' },
  { cityKey: 'brasilia-df', nome: 'Brasília - DF', lat: -15.7939, lng: -47.8828, origem: 'manual' },
];

const lugaresDeExemplo = (c: CidadeAtual) => SAMPLE_PLACES.filter((p) => p.cityKey === c.cityKey);

const formatarDistancia = (km: number) =>
  km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1).replace('.', ',')} km`;

function AvisoLocalizacao({
  estado,
  onUsar,
  onEscolher,
}: {
  estado: 'pedindo' | FalhaLocalizacao;
  onUsar: () => void;
  onEscolher: () => void;
}) {
  if (estado === 'pedindo') {
    return (
      <p className="mx-4 mb-4 flex items-center gap-2 text-[13px] text-muted" role="status">
        <Navigation size={14} strokeWidth={2} className="text-primary" />
        Procurando sua cidade…
      </p>
    );
  }
  const negado = estado === 'negado';
  return (
    <div className="mx-4 mb-5 flex items-center gap-3 rounded-2xl bg-s1 p-4 ring-1 ring-line">
      <Mascote reacao="pensativo" tamanho={56} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">
          {negado ? 'Localização desligada' : 'Não deu para achar sua localização'}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          {negado
            ? 'Para ver os lugares da sua cidade, libere a localização para o Vimo nos ajustes do celular, ou escolha a cidade.'
            : 'Tente de novo ou escolha a cidade.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onUsar} className="h-9 whitespace-nowrap rounded-full bg-primary px-3.5 text-[13px] font-semibold text-white cursor-pointer">
            {negado ? 'Tentar de novo' : 'Usar localização'}
          </button>
          <button type="button" onClick={onEscolher} className="h-9 whitespace-nowrap rounded-full bg-s2 px-3.5 text-[13px] font-semibold text-ink cursor-pointer">
            Escolher cidade
          </button>
        </div>
      </div>
    </div>
  );
}

function EsqueletoLugares() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4" aria-label="Carregando lugares" role="status">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-s2" />
      ))}
    </div>
  );
}
