import { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Check,
  Star,
  Bookmark,
  Calendar,
  Search,
  MapPin,
  ArrowUpRight,
  Plus,
  Compass,
  Utensils,
  BookOpen,
} from 'lucide-react';
import type { Place, Review, UserProfile } from '../types';
import { obterListasUsuario, alternarListaUsuario, carregarReviewsDoUsuario } from '../lib/reviews';
import { getPlace, SAMPLE_PLACES } from '../lib/places';
import RestaurantCard from '../components/RestaurantCard';
import MascotMessage from '../components/MascotMessage';

export type ColecaoTab = 'salvos' | 'jafui' | 'avaliacoes' | 'queroConhecer';

interface ColecaoScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (placeOrId: Place | string) => void;
  onNovaAvaliacao?: () => void;
  onExplorar?: () => void;
}

export default function ColecaoScreen({
  currentUser,
  onAbrirLugar,
  onNovaAvaliacao,
  onExplorar,
}: ColecaoScreenProps) {
  const [tabAtiva, setTabAtiva] = useState<ColecaoTab>('salvos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [listas, setListas] = useState<{
    queroIr: string[];
    jaFui: string[];
    favoritos: string[];
  }>({ queroIr: [], jaFui: [], favoritos: [] });

  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState<Review[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});

  // Carrega listas do usuário e avaliações
  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      const l = obterListasUsuario(currentUser.uid);
      setListas(l);

      try {
        const minhas = await carregarReviewsDoUsuario(currentUser.uid);
        if (ativo) {
          setMinhasAvaliacoes(minhas);
        }
      } catch (err) {
        console.warn('Erro ao carregar avaliações do usuário:', err);
      }

      // Prepara cache de lugares
      const map: Record<string, Place> = {};
      SAMPLE_PLACES.forEach((p) => {
        map[p.id] = p;
      });

      const todosIds = Array.from(
        new Set([...l.favoritos, ...l.jaFui, ...l.queroIr])
      );

      for (const id of todosIds) {
        if (!map[id]) {
          try {
            const p = await getPlace(id);
            if (p) map[id] = p;
          } catch {
            // fallback
          }
        }
      }

      if (ativo) {
        setPlacesCache(map);
        setCarregando(false);
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [currentUser.uid]);

  const handleToggleFavorito = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alternarListaUsuario(currentUser.uid, 'favoritos', placeId);
    setListas(obterListasUsuario(currentUser.uid));
  };

  const handleToggleQueroIr = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alternarListaUsuario(currentUser.uid, 'queroIr', placeId);
    setListas(obterListasUsuario(currentUser.uid));
  };

  // 1. Lugares Salvos
  const lugaresSalvos = useMemo(() => {
    return listas.favoritos
      .map((id) => placesCache[id])
      .filter((p): p is Place => !!p)
      .filter((p) =>
        busca.trim()
          ? p.name.toLowerCase().includes(busca.toLowerCase()) ||
            p.address.toLowerCase().includes(busca.toLowerCase())
          : true
      );
  }, [listas.favoritos, placesCache, busca]);

  // 2. Lugares Quero Conhecer
  const lugaresQueroConhecer = useMemo(() => {
    return listas.queroIr
      .map((id) => placesCache[id])
      .filter((p): p is Place => !!p)
      .filter((p) =>
        busca.trim()
          ? p.name.toLowerCase().includes(busca.toLowerCase()) ||
            p.address.toLowerCase().includes(busca.toLowerCase())
          : true
      );
  }, [listas.queroIr, placesCache, busca]);

  // 3. Lugares Já Fui (Diário Gastronômico)
  // Agrupa visitas por mês/ano para criar a sensação de diário pessoal
  const diarioItems = useMemo(() => {
    const list: Array<{
      id: string;
      placeId: string;
      placeName: string;
      placePhoto?: string;
      category?: string;
      address?: string;
      visitedAt: number;
      rating?: number;
      reviewText?: string;
      photos?: string[];
    }> = [];

    // Junta lugares com review com lugares apenas marcados com já fui
    const reviewByPlace: Record<string, Review> = {};
    minhasAvaliacoes.forEach((r) => {
      reviewByPlace[r.placeId] = r;
    });

    listas.jaFui.forEach((id) => {
      const p = placesCache[id];
      const rev = reviewByPlace[id];

      list.push({
        id: rev ? rev.id : `jafui-${id}`,
        placeId: id,
        placeName: p?.name || rev?.placeName || 'Restaurante',
        placePhoto: p?.photoUrl || rev?.placePhotoUrl || SAMPLE_PLACES[0].photoUrl,
        category: p?.tipo || 'Gastronomia',
        address: p?.address,
        visitedAt: rev?.visitedAt || Date.now() - 3600000 * 24 * 7,
        rating: rev?.overall,
        reviewText: rev?.text,
        photos: rev?.photos || [],
      });
    });

    // Se houver busca, filtra
    const filtered = list.filter((item) =>
      busca.trim()
        ? item.placeName.toLowerCase().includes(busca.toLowerCase()) ||
          (item.reviewText && item.reviewText.toLowerCase().includes(busca.toLowerCase()))
        : true
    );

    // Ordena mais recente primeiro
    filtered.sort((a, b) => b.visitedAt - a.visitedAt);

    // Agrupa por Mês/Ano
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach((item) => {
      const date = new Date(item.visitedAt);
      const mesAno = date.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });
      const mesFormatado = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      if (!grouped[mesFormatado]) grouped[mesFormatado] = [];
      grouped[mesFormatado].push(item);
    });

    return grouped;
  }, [listas.jaFui, minhasAvaliacoes, placesCache, busca]);

  return (
    <div className="w-full space-y-4 pt-1">
      {/* Barra de Busca na Coleção */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar em seus restaurantes salvos ou visitas..."
          className="w-full min-h-11 pl-10 pr-4 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition"
        />
      </div>

      {/* Navegação por Abas (Tabs) Clean e Discreta */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setTabAtiva('salvos')}
          className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            tabAtiva === 'salvos'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Heart
            size={13}
            className={tabAtiva === 'salvos' ? 'fill-current' : 'text-[var(--muted)]'}
          />
          <span>Salvos ({listas.favoritos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva('jafui')}
          className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            tabAtiva === 'jafui'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Check
            size={13}
            strokeWidth={tabAtiva === 'jafui' ? 3 : 2}
            className={tabAtiva === 'jafui' ? 'text-[var(--on-primary)]' : 'text-[var(--muted)]'}
          />
          <span>Já Fui ({listas.jaFui.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva('avaliacoes')}
          className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            tabAtiva === 'avaliacoes'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Star
            size={13}
            className={tabAtiva === 'avaliacoes' ? 'fill-current' : 'text-[var(--muted)]'}
          />
          <span>Avaliações ({minhasAvaliacoes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva('queroConhecer')}
          className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            tabAtiva === 'queroConhecer'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Bookmark
            size={13}
            className={tabAtiva === 'queroConhecer' ? 'fill-current' : 'text-[var(--muted)]'}
          />
          <span>Quero Conhecer ({listas.queroIr.length})</span>
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="space-y-4">
        {carregando ? (
          <div className="py-16 text-center flex flex-col items-center gap-2">
            <img src="/mascote/curioso.png" alt="" aria-hidden="true" width={80} height={80} className="object-contain animate-pulse" />
            <p className="text-[13px] text-[var(--muted)]">Carregando sua coleção...</p>
          </div>
        ) : (
          <>
            {/* 1. ABA: SALVOS */}
            {tabAtiva === 'salvos' && (
              <div>
                {lugaresSalvos.length === 0 ? (
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--s1)] my-4">
                    <MascotMessage
                      reaction="amor"
                      title="Nenhum restaurante salvo ainda"
                      subtitle="Explore restaurantes incríveis e salve os seus favoritos com o coração para encontrá-los facilmente aqui."
                      ctaLabel={onExplorar ? 'Explorar restaurantes' : undefined}
                      onCta={onExplorar}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lugaresSalvos.map((place) => (
                      <RestaurantCard
                        key={place.id}
                        image={place.photoUrl || SAMPLE_PLACES[0].photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'}
                        name={place.name}
                        rating={place.rating}
                        reviewCount={place.reviewsCount}
                        category={place.tipo || 'Restaurante'}
                        priceRange={place.priceLevel}
                        location={place.address}
                        isOpen={place.openNow}
                        isSaved={true}
                        hasVisited={listas.jaFui.includes(place.id)}
                        onClick={() => onAbrirLugar(place)}
                        onToggleSave={(e) => handleToggleFavorito(place.id, e)}
                        variant="default"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. ABA: JÁ FUI (MEU DIÁRIO GASTRONÔMICO) */}
            {tabAtiva === 'jafui' && (
              <div className="space-y-8">
                {Object.keys(diarioItems).length === 0 ? (
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--s1)] my-4">
                    <MascotMessage
                      reaction="lendo"
                      title="Seu diário gastronômico está vazio"
                      subtitle="Marque os restaurantes que você já visitou e adicione suas impressões para guardar sua história gastronômica."
                      ctaLabel={onNovaAvaliacao ? 'Registrar primeira visita' : undefined}
                      onCta={onNovaAvaliacao}
                    />
                  </div>
                ) : (
                  Object.entries(diarioItems).map(([mesAno, itens]) => (
                    <section key={mesAno} className="space-y-4">
                      {/* Marcador Temporal da Linha do Tempo */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0D3E2F] dark:text-[#2DD4BF] bg-[#EBF3EE] dark:bg-[#1A3127] px-3 py-1 rounded-full">
                          {mesAno}
                        </span>
                        <div className="h-[1px] flex-1 bg-[#E5EAE6] dark:border-[#26332C]" />
                      </div>

                      {/* Lista de Registros daquele Mês */}
                      <div className="space-y-4">
                        {itens.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => onAbrirLugar(item.placeId)}
                            className="bg-white dark:bg-[#171E1A] rounded-[24px] p-4 border border-[#E5EAE6] dark:border-[#26332C] hover:border-[#0D3E2F]/40 shadow-sm transition cursor-pointer"
                          >
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                              {/* Foto do Restaurante */}
                              <div className="w-full sm:w-36 h-36 rounded-2xl overflow-hidden shrink-0 bg-[#F0F3F1] dark:bg-[#1E2722] relative">
                                <img
                                  src={item.placePhoto}
                                  alt={item.placeName}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute top-2 left-2 bg-[#0D3E2F] text-white text-[12px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <Check size={10} strokeWidth={3} /> Já fui
                                </div>
                              </div>

                              {/* Conteúdo do Registro */}
                              <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <h4 className="font-semibold text-base text-[#141715] dark:text-[#F2F5F3]">
                                      {item.placeName}
                                    </h4>
                                    <p className="text-xs text-[#636C66] dark:text-[#95A199]">
                                      {item.category} {item.address ? `· ${item.address}` : ''}
                                    </p>
                                  </div>

                                  <span className="text-[11px] text-[#8F9992] flex items-center gap-1 shrink-0">
                                    <Calendar size={11} />
                                    {new Date(item.visitedAt).toLocaleDateString(
                                      'pt-BR',
                                      { day: '2-digit', month: 'short', year: 'numeric' }
                                    )}
                                  </span>
                                </div>

                                {/* Avaliação e Estrelas se houver */}
                                {item.rating && (
                                  <div className="flex items-center gap-1.5 my-2">
                                    <div className="flex items-center text-[var(--star)]">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          size={13}
                                          className={
                                            star <= Math.round(item.rating || 0)
                                              ? 'fill-[var(--star)]'
                                              : 'text-[#E5EAE6]'
                                          }
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs font-bold text-[#141715] dark:text-[#F2F5F3]">
                                      {item.rating.toFixed(1).replace('.', ',')}
                                    </span>
                                  </div>
                                )}

                                {/* Comentário do Usuário */}
                                {item.reviewText ? (
                                  <p className="text-xs sm:text-sm text-[#141715] dark:text-[#D5DDD7] bg-[#F7F9F7] dark:bg-[#1E2722] p-3 rounded-2xl italic mb-3 border border-[#E5EAE6]/60 dark:border-[#26332C]">
                                    "{item.reviewText}"
                                  </p>
                                ) : (
                                  <p className="text-xs text-[#8F9992] italic my-2">
                                    Nenhum comentário registrado nesta visita.
                                  </p>
                                )}

                                {/* Fotos anexadas na visita */}
                                {item.photos && item.photos.length > 0 && (
                                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {item.photos.slice(0, 4).map((f, i) => (
                                      <img
                                        key={i}
                                        src={f}
                                        alt="Foto da visita"
                                        className="w-14 h-14 rounded-xl object-cover border border-[#E5EAE6] dark:border-[#26332C]"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}

            {/* 3. ABA: MINHAS AVALIAÇÕES */}
            {tabAtiva === 'avaliacoes' && (
              <div>
                {minhasAvaliacoes.length === 0 ? (
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--s1)] my-4">
                    <MascotMessage
                      reaction="analisando"
                      title="Você ainda não fez avaliações"
                      subtitle="Conte como foi sua experiência nos restaurantes que você visitou e ajude outros amantes da gastronomia."
                      ctaLabel={onNovaAvaliacao ? 'Escrever avaliação' : undefined}
                      onCta={onNovaAvaliacao}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {minhasAvaliacoes.map((rev) => (
                      <div
                        key={rev.id}
                        onClick={() => onAbrirLugar(rev.placeId)}
                        className="bg-white dark:bg-[#171E1A] rounded-[24px] p-5 border border-[#E5EAE6] dark:border-[#26332C] hover:border-[#0D3E2F]/40 shadow-sm transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-semibold text-base text-[#141715] dark:text-[#F2F5F3]">
                              {rev.placeName}
                            </h4>
                            <p className="text-xs text-[#636C66] dark:text-[#95A199]">
                              {rev.cityName || 'São Paulo, SP'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 bg-[#EBF3EE] dark:bg-[#1A3127] text-[#0D3E2F] dark:text-[#2DD4BF] px-2.5 py-1 rounded-full text-xs font-bold">
                            <Star size={12} className="fill-current" />
                            {rev.overall.toFixed(1).replace('.', ',')}
                          </div>
                        </div>

                        {rev.text && (
                          <p className="text-xs sm:text-sm text-[#141715] dark:text-[#D5DDD7] leading-relaxed my-2">
                            {rev.text}
                          </p>
                        )}

                        {rev.photos && rev.photos.length > 0 && (
                          <div className="flex items-center gap-2 my-3 overflow-x-auto">
                            {rev.photos.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="Foto do prato"
                                className="w-16 h-16 rounded-xl object-cover border border-[#E5EAE6] dark:border-[#26332C]"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#8F9992] pt-2 border-t border-[#E5EAE6] dark:border-[#26332C]">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Visitado em{' '}
                            {new Date(rev.visitedAt).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[#0D3E2F] font-semibold flex items-center gap-0.5">
                            Ver restaurante <ArrowUpRight size={12} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. ABA: QUERO CONHECER */}
            {tabAtiva === 'queroConhecer' && (
              <div>
                {lugaresQueroConhecer.length === 0 ? (
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--s1)] my-4">
                    <MascotMessage
                      reaction="explorando"
                      title="Sua lista de desejos está vazia"
                      subtitle="Encontrou um lugar que gostaria de conhecer? Marque como 'Quero conhecer' para planejar suas próximas saídas."
                      ctaLabel={onExplorar ? 'Explorar restaurantes' : undefined}
                      onCta={onExplorar}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lugaresQueroConhecer.map((place) => (
                      <RestaurantCard
                        key={place.id}
                        image={place.photoUrl || SAMPLE_PLACES[0].photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'}
                        name={place.name}
                        rating={place.rating}
                        reviewCount={place.reviewsCount}
                        category={place.tipo || 'Restaurante'}
                        priceRange={place.priceLevel}
                        location={place.address}
                        isOpen={place.openNow}
                        isSaved={listas.favoritos.includes(place.id)}
                        hasVisited={listas.jaFui.includes(place.id)}
                        onClick={() => onAbrirLugar(place)}
                        onToggleSave={(e) => handleToggleFavorito(place.id, e)}
                        variant="default"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
