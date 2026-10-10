import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import { SAMPLE_PLACES, autocompleteCidade, formatarPrecoLabel } from '../lib/places';
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

interface ExplorarScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (place: Place | string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
  onAbrirAvaliar?: () => void;
  onMudarTab?: (tab: 'explorar' | 'mapa' | 'amigos' | 'perfil') => void;
  tema?: 'dark' | 'light';
  onToggleTema?: () => void;
}

export default function ExplorarScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
  onAbrirBusca: _onAbrirBusca,
  onAbrirAvaliar: _onAbrirAvaliar,
  onMudarTab: _onMudarTab,
  tema: _tema,
  onToggleTema: _onToggleTema,
}: ExplorarScreenProps) {
  const [cidadeAtual, setCidadeAtual] = useState({
    cityKey: currentUser.homeCityKey || 'sao-paulo-sp',
    nome: currentUser.homeCityName || 'São Paulo - SP',
  });
  const [cidadeModalAberta, setCidadeModalAberta] = useState(false);
  const [buscaCidade, setBuscaCidade] = useState('');
  const [sugestoesCidade, setSugestoesCidade] = useState<{ texto: string; cityKey: string }[]>([]);

  const [filtroTipo, setFiltroTipo] = useState<TipoRestauranteFiltro>('todos');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  useEscape(() => setCidadeModalAberta(false), cidadeModalAberta);

  // Filtragem dos restaurantes por tipo
  const lugaresFiltrados = useMemo(() => {
    let list = SAMPLE_PLACES;

    // Filtro por termo de busca digitado
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

    // Filtro por categoria — prioriza campos estruturados (tipo, cuisine, category), fallback por nome
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
  }, [filtroTipo, buscaTermo]);

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
    [p.cuisine || (p.tipo ? TIPOS[p.tipo] || p.tipo : null), p.bairro, p.priceLevel ? formatarPrecoLabel(p.priceLevel) : null]
      .filter(Boolean)
      .join(' · ');

  // Em destaque: melhor combinação de nota e volume de avaliações
  const populares = useMemo(
    () =>
      [...lugaresFiltrados].sort((a, b) => {
        const notaA = a.vimoRating ?? a.googleRating ?? 0;
        const notaB = b.vimoRating ?? b.googleRating ?? 0;
        const volA = a.vimoReviewsCount ?? a.googleUserRatingCount ?? a.reviewsCount ?? 0;
        const volB = b.vimoReviewsCount ?? b.googleUserRatingCount ?? b.reviewsCount ?? 0;
        return notaB * Math.log(volB + 1) - notaA * Math.log(volA + 1);
      }),
    [lugaresFiltrados]
  );

  // Fileiras por tipo (só aparecem com pelo menos 3 lugares)
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
      {/* Cabeçalho: marca, cidade e notificações */}
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
          {/* Busca */}
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

          {/* Filtros em pílula */}
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
        {lugaresFiltrados.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={buscaTermo ? `Nada encontrado para "${buscaTermo.trim()}"` : 'Nenhum lugar neste filtro'}
            subtitle="Tente outro nome, bairro ou cozinha."
            ctaLabel="Limpar filtros"
            onCta={limparFiltros}
          />
        ) : buscaTermo || filtroTipo !== 'todos' ? (
          /* Busca ou filtro: uma grade só, sem seções */
          <section className="px-4">
            <CabecalhoSecao titulo={buscaTermo ? 'Resultados' : chips.find((c) => c.id === filtroTipo)?.label || 'Lugares'} total={lugaresFiltrados.length} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              {lugaresFiltrados.map((place) => (
                <Poster key={place.id} place={place} meta={metaDe(place)} onAbrir={onAbrirLugar} />
              ))}
            </div>
          </section>
        ) : (
          /* Início: estilo Letterboxd, muitos pôsteres e nenhuma nota (a nota aparece no lugar) */
          <div className="space-y-9">
            <section className="px-4">
              <CabecalhoSecao titulo="Em destaque" total={lugaresFiltrados.length} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                {populares.slice(0, 4).map((place) => (
                  <Poster key={place.id} place={place} meta={metaDe(place)} onAbrir={onAbrirLugar} />
                ))}
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

      {/* Trocar cidade: folha inferior */}
      {cidadeModalAberta && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setCidadeModalAberta(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cidade"
            onClick={(e) => e.stopPropagation()}
            className="animate-in slide-in-from-bottom w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-s1 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-s3 sm:hidden" />
            <div className="flex items-center justify-between pb-3">
              <h3 id="titulo-cidade" className="t-section text-ink">Trocar cidade</h3>
              <button type="button" onClick={() => setCidadeModalAberta(false)} aria-label="Fechar" className={btn.icon}>
                <X size={18} />
              </button>
            </div>

            <label className="flex h-11 items-center gap-2.5 rounded-lg bg-s2 px-3 ring-1 ring-transparent focus-within:ring-primary transition">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" />
              <input
                type="text"
                autoFocus
                value={buscaCidade}
                onChange={(e) => {
                  const val = e.target.value;
                  setBuscaCidade(val);
                  if (val.trim().length > 1) {
                    autocompleteCidade(val)
                      .then((res) => setSugestoesCidade(res))
                      .catch(() => setSugestoesCidade([]));
                  } else {
                    setSugestoesCidade([]);
                  }
                }}
                placeholder="Nome da cidade"
                aria-label="Buscar cidade"
                className="w-full bg-transparent text-base text-ink placeholder:text-muted outline-none"
              />
            </label>

            <ul className="mt-2 max-h-64 overflow-y-auto">
              {(buscaCidade.trim().length > 1
                ? sugestoesCidade
                : [
                    { texto: 'São Paulo - SP', cityKey: 'sao-paulo-sp' },
                    { texto: 'Rio de Janeiro - RJ', cityKey: 'rio-de-janeiro-rj' },
                    { texto: 'Curitiba - PR', cityKey: 'curitiba-pr' },
                    { texto: 'Belo Horizonte - MG', cityKey: 'belo-horizonte-mg' },
                  ]
              ).map((cid) => {
                const atual = cid.cityKey === cidadeAtual.cityKey;
                return (
                  <li key={cid.cityKey}>
                    <button
                      type="button"
                      onClick={() => {
                        setCidadeAtual({ cityKey: cid.cityKey, nome: cid.texto });
                        setCidadeModalAberta(false);
                        setBuscaCidade('');
                        setSugestoesCidade([]);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-base transition-colors hover:bg-s2 cursor-pointer ${
                        atual ? 'font-semibold text-ink' : 'text-ink-2'
                      }`}
                    >
                      <MapPin size={16} strokeWidth={1.8} className={atual ? 'text-star' : 'text-muted'} />
                      <span>{cid.texto}</span>
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

/** Título de seção com contagem à direita, como nas listas do Letterboxd. */
function CabecalhoSecao({ titulo, total }: { titulo: string; total: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{titulo}</h2>
      <span className="text-xs font-medium text-muted tabular">
        {total} {total === 1 ? 'lugar' : 'lugares'}
      </span>
    </div>
  );
}

/** Pôster de lugar: foto em 4:5, nome embaixo. Sem nota: ela aparece ao abrir o lugar. */
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
      </div>
      <p className={`mt-2 truncate font-semibold tracking-tight text-ink ${pequeno ? 'text-[13px]' : 'text-[15px]'}`}>
        {place.name}
      </p>
      {meta && <p className="truncate text-xs text-muted">{meta}</p>}
    </button>
  );
}
