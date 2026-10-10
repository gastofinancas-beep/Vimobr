import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import { SAMPLE_PLACES, autocompleteCidade } from '../lib/places';
import type { Place, UserProfile } from '../types';
import MascotMessage from '../components/MascotMessage';
import { PlaceImage, btn } from '../components/ui';
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

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      {/* Cabeçalho: marca, cidade e notificações */}
      <header className="sticky top-0 z-30 bg-bg">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-[22px] font-extrabold tracking-[-0.045em] text-ink select-none">
              VIMO<span className="text-star">.</span>
            </span>
            <button
              type="button"
              onClick={() => setCidadeModalAberta(true)}
              aria-label={`Cidade: ${cidadeAtual.nome}. Trocar cidade`}
              className="flex min-w-0 items-center gap-0.5 text-sm font-medium text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[150px]">{cidadeCurta}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
          </div>

          <NotificationBell
            currentUserUid={currentUser.uid}
            onClick={() => setMostrarNotificacoes(true)}
            className={btn.icon}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4">
          {/* Busca */}
          <label className="flex h-11 items-center gap-2.5 rounded-lg bg-s2 px-3 ring-1 ring-transparent focus-within:ring-primary transition">
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" />
            <input
              type="search"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar lugar, bairro ou culinária"
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

          {/* Filtros por tipo: texto, o ativo fica sublinhado */}
          <div className="mt-3 flex gap-5 overflow-x-auto no-scrollbar border-b border-line">
            {chips.map((chip) => {
              const ativo = filtroTipo === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFiltroTipo(chip.id)}
                  aria-pressed={ativo}
                  className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm transition-colors cursor-pointer ${
                    ativo ? 'border-primary font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {lugaresFiltrados.length === 0 ? (
          <MascotMessage
            reaction="confuso"
            title={buscaTermo ? `Nada encontrado para "${buscaTermo.trim()}"` : 'Nenhum lugar neste filtro'}
            subtitle="Tente outro nome, bairro ou culinária."
            ctaLabel="Limpar filtros"
            onCta={limparFiltros}
          />
        ) : (
          <>
            <p className="t-meta mb-3 tabular">
              {lugaresFiltrados.length} {lugaresFiltrados.length === 1 ? 'lugar' : 'lugares'} em {cidadeCurta}
            </p>
            {/* Grade de pôsteres 3:4 com o nome dentro */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-3">
              {lugaresFiltrados.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => onAbrirLugar(place)}
                  aria-label={place.name}
                  className="group relative block aspect-[3/4] w-full overflow-hidden rounded-md text-left cursor-pointer"
                >
                  <PlaceImage src={place.photoUrl} name={place.name} className="absolute inset-0 h-full w-full" />
                  {/* Faixa sólida com o nome (legível sobre qualquer foto) */}
                  <span className="absolute inset-x-0 bottom-0 bg-[#111119]/80 px-2.5 py-2">
                    <span className="block text-[13px] font-semibold leading-snug text-[#F7F3EE] line-clamp-2">
                      {place.name}
                    </span>
                    {place.bairro && (
                      <span className="mt-0.5 block truncate text-2xs text-[#F7F3EE]/65">{place.bairro}</span>
                    )}
                  </span>
                  <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/5 group-hover:ring-primary/60 transition" />
                </button>
              ))}
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
