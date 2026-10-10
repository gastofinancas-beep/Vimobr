import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import { SAMPLE_PLACES, autocompleteCidade, formatarPrecoLabel } from '../lib/places';
import type { Place, UserProfile } from '../types';
import MascotMessage from '../components/MascotMessage';
import { PlaceImage, RatingBadge, Logo, btn, chip, card } from '../components/ui';
import { Mascote } from '../components/Mascote';
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

    // Filtro pelo tipo de restaurante
    if (filtroTipo === 'italiana') {
      list = list.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes('trattoria') || n.includes('pizza') || n.includes('pasta') || n.includes('nonno') || n.includes('forno') || n.includes('napoletana');
      });
    } else if (filtroTipo === 'hamburguer') {
      list = list.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes('burger') || n.includes('hamburguer') || n.includes('craft');
      });
    } else if (filtroTipo === 'japonesa') {
      list = list.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes('sushi') || n.includes('omakase') || n.includes('shima') || n.includes('ramen') || n.includes('japones');
      });
    } else if (filtroTipo === 'cafe_padaria') {
      list = list.filter((p) => p.tipo === 'cafe' || p.tipo === 'bakery' || p.name.toLowerCase().includes('padaria') || p.name.toLowerCase().includes('café') || p.name.toLowerCase().includes('torra') || p.name.toLowerCase().includes('confeitaria'));
    } else if (filtroTipo === 'bistro') {
      list = list.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes('bistrô') || n.includes('maniçoba') || n.includes('contemporâneo');
      });
    } else if (filtroTipo === 'carnes') {
      list = list.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes('parrilla') || n.includes('fogo') || n.includes('carne') || n.includes('steak');
      });
    } else if (filtroTipo === 'bar') {
      list = list.filter((p) => p.tipo === 'bar' || p.name.toLowerCase().includes('bar') || p.name.toLowerCase().includes('boteco') || p.name.toLowerCase().includes('coquetelaria'));
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

      <main className="max-w-4xl mx-auto px-4 pt-1">
        {lugaresFiltrados.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={buscaTermo ? `Nada encontrado para "${buscaTermo.trim()}"` : 'Nenhum lugar neste filtro'}
            subtitle="Tente outro nome, bairro ou cozinha."
            ctaLabel="Limpar filtros"
            onCta={limparFiltros}
          />
        ) : (
          <>
            {/* Saudação: o mascote curioso convida a descobrir */}
            {!buscaTermo && filtroTipo === 'todos' && (
              <div className="mb-4 flex items-center gap-3">
                <Mascote reacao="curioso" tamanho={52} />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight text-ink">Onde vamos comer hoje?</h1>
                  <p className="text-sm text-muted tabular">
                    {lugaresFiltrados.length} lugares para descobrir em {cidadeCurta}
                  </p>
                </div>
              </div>
            )}

            {/* Cartões com foto em destaque */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lugaresFiltrados.map((place) => {
                const nota = place.googleRating ?? place.rating ?? null;
                const meta = metaDe(place);
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => onAbrirLugar(place)}
                    aria-label={place.name}
                    className={`${card} group overflow-hidden text-left transition-transform active:scale-[0.99] cursor-pointer`}
                  >
                    <div className="relative overflow-hidden">
                      <PlaceImage
                        src={place.photoUrl}
                        name={place.name}
                        className="aspect-[16/10] w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                      {nota !== null && <RatingBadge nota={nota} className="absolute right-3 top-3" />}
                    </div>
                    <div className="px-4 pb-4 pt-3">
                      <h3 className="truncate text-[17px] font-semibold tracking-tight text-ink">{place.name}</h3>
                      {meta && <p className="mt-0.5 truncate text-sm text-muted">{meta}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
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
