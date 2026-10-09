import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  MapPin,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import PlacePlaceholder from '../components/PlacePlaceholder';
import MascotMessage from '../components/MascotMessage';
import { SAMPLE_PLACES, autocompleteCidade } from '../lib/places';
import type { Place, UserProfile } from '../types';

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
  tema = 'dark',
  onToggleTema,
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
    { id: 'italiana', label: 'Italiana & Massas' },
    { id: 'hamburguer', label: 'Hamburguerias' },
    { id: 'japonesa', label: 'Japonesa & Sushi' },
    { id: 'cafe_padaria', label: 'Cafés & Padarias' },
    { id: 'bistro', label: 'Bistrôs' },
    { id: 'carnes', label: 'Carnes & Parrilla' },
    { id: 'bar', label: 'Bares & Coquetelaria' },
  ];

  return (
    <div className="flex-1 w-full bg-[var(--bg)] text-[var(--ink)] min-h-screen pb-20">
      {/* HEADER PRINCIPAL NO ESTILO LETTERBOXD */}
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo Wordmark oficial VIMO. & Seletor de Cidade */}
          <div className="flex items-center gap-3">
            <span className="font-sans font-black text-xl tracking-[-0.04em] text-[var(--ink)] select-none">
              VIMO<span className="text-[var(--star)]">.</span>
            </span>

            <button
              type="button"
              onClick={() => setCidadeModalAberta(true)}
              aria-label="Selecionar cidade"
              className="px-2.5 py-1 rounded-full bg-[var(--s1)] border border-[var(--line)] hover:border-[var(--primary)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1.5 transition cursor-pointer min-h-8"
            >
              <MapPin size={12} className="text-[var(--star)] shrink-0" />
              <span className="truncate max-w-[120px]">{cidadeAtual.nome}</span>
              <ChevronDown size={11} className="text-[var(--muted)] shrink-0" />
            </button>
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2">
            {onToggleTema && (
              <button
                type="button"
                onClick={onToggleTema}
                aria-label="Alternar tema claro e escuro"
                className="w-9 h-9 rounded-full bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--primary)] flex items-center justify-center transition cursor-pointer min-h-9 min-w-9"
              >
                {tema === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            )}

            <NotificationBell
              currentUserUid={currentUser.uid}
              onClick={() => setMostrarNotificacoes(true)}
              className="w-9 h-9 rounded-full bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--primary)] flex items-center justify-center transition cursor-pointer min-h-9 min-w-9"
            />

            <button
              type="button"
              onClick={() => onAbrirPerfil(currentUser.uid)}
              aria-label="Acessar meu perfil"
              className="w-9 h-9 rounded-full overflow-hidden p-0.5 ring-1 ring-[var(--line)] hover:ring-[var(--primary)] transition cursor-pointer min-h-9 min-w-9"
            >
              <img
                src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={currentUser.displayName}
                className="w-full h-full object-cover rounded-full"
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* BARRA DE PESQUISA (sem botão + ao lado) */}
        <div className="w-full">
          <div className="w-full h-11 rounded-xl bg-[var(--s1)] px-3.5 flex items-center gap-2.5 text-xs text-[var(--muted)] border border-[var(--line)] focus-within:border-[var(--primary)] transition shadow-2xs">
            <Search size={16} className="text-[var(--muted)] shrink-0" />
            <input
              type="text"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar por nome, bairro ou culinária..."
              aria-label="Buscar restaurantes"
              className="w-full bg-transparent text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none text-xs sm:text-sm"
            />
            {buscaTermo && (
              <button
                type="button"
                onClick={() => setBuscaTermo('')}
                aria-label="Limpar termo de busca"
                className="text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* FILTROS POR TIPO DE RESTAURANTE (chips roláveis) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          {chips.map((chip) => {
            const isAtivo = filtroTipo === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFiltroTipo(chip.id)}
                aria-pressed={isAtivo}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition shrink-0 cursor-pointer min-h-8 ${
                  isAtivo
                    ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-xs'
                    : 'bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* GRADE DE CARDS DOS RESTAURANTES (ESTILO PÔSTER LETTERBOXD) */}
        <section className="space-y-3 pt-1">
          {lugaresFiltrados.length === 0 ? (
            <div className="bg-[var(--s1)] rounded-2xl border border-[var(--line)]">
              <MascotMessage
                reaction="pensando"
                title="Nenhum restaurante encontrado"
                subtitle="Tente buscar com outro termo ou limpar os filtros."
                ctaLabel="Limpar filtros"
                onCta={() => {
                  setFiltroTipo('todos');
                  setBuscaTermo('');
                }}
                size={100}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lugaresFiltrados.map((place) => (
                <article
                  key={place.id}
                  onClick={() => onAbrirLugar(place)}
                  className="group cursor-pointer space-y-1.5 focus:outline-none transition duration-150"
                >
                  {/* Poster Vertical Estilo Letterboxd (Aspect 3/4) */}
                  <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[var(--s2)] border border-[var(--line)] group-hover:border-[var(--primary)] transition-all duration-200 shadow-2xs">
                    {place.photoUrl ? (
                      <img
                        src={place.photoUrl}
                        alt={place.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                      />
                    ) : (
                      <PlacePlaceholder name={place.name} className="w-full h-full" />
                    )}
                  </div>

                  {/* Nome do Restaurante embaixo */}
                  <div className="pt-0.5 px-0.5">
                    <h3 className="font-sans font-medium text-[13px] text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors leading-tight truncate">
                      {place.name}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MODAL DE SELEÇÃO DE CIDADE */}
      {cidadeModalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--s1)] border border-[var(--line)] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Selecionar Cidade
              </h3>
              <button
                type="button"
                onClick={() => setCidadeModalAberta(false)}
                aria-label="Fechar seleção de cidade"
                className="p-1 text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
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
              placeholder="Digite o nome da cidade..."
              aria-label="Buscar cidade"
              className="w-full h-10 px-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
            />

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(buscaCidade.trim().length > 1
                ? sugestoesCidade
                : [
                    { texto: 'São Paulo - SP', cityKey: 'sao-paulo-sp' },
                    { texto: 'Rio de Janeiro - RJ', cityKey: 'rio-de-janeiro-rj' },
                    { texto: 'Curitiba - PR', cityKey: 'curitiba-pr' },
                    { texto: 'Belo Horizonte - MG', cityKey: 'belo-horizonte-mg' },
                  ]
              ).map((cid) => (
                <button
                  key={cid.cityKey}
                  type="button"
                  onClick={() => {
                    setCidadeAtual({ cityKey: cid.cityKey, nome: cid.texto });
                    setCidadeModalAberta(false);
                    setBuscaCidade('');
                    setSugestoesCidade([]);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--s2)] transition cursor-pointer flex items-center gap-2"
                >
                  <MapPin size={12} className="text-[var(--star)] shrink-0" />
                  <span>{cid.texto}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTIFICAÇÕES */}
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
