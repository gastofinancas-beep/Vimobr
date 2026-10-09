import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Check,
  Star,
  MapPin,
  Navigation as NavigationIcon,
  Map as MapIcon,
  Share2,
  Plus,
  ThumbsUp,
  MessageSquare,
  Images,
  X,
} from 'lucide-react';
import { getPlace, SAMPLE_PLACES } from '../lib/places';
import {
  alternarListaUsuario,
  obterListasUsuario,
  carregarReviewsDoLugar,
  obterScoreRestaurante,
} from '../lib/reviews';
import StarRating from '../components/StarRating';
import type { Place, Review, UserProfile } from '../types';

interface PlaceDetailScreenProps {
  placeId: string;
  initialPlace?: Place | null;
  currentUser: UserProfile;
  onVoltar: () => void;
  onAvaliar: (p: Place) => void;
  onAbrirPerfil: (uid: string) => void;
}

export default function PlaceDetailScreen({
  placeId,
  initialPlace,
  currentUser,
  onVoltar,
  onAvaliar,
  onAbrirPerfil,
}: PlaceDetailScreenProps) {
  const [place, setPlace] = useState<Place | null>(initialPlace || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(!initialPlace);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [mostrarTodasFotos, setMostrarTodasFotos] = useState(false);

  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const [reviewLikesCount, setReviewLikesCount] = useState<Record<string, number>>({});

  const [listas, setListas] = useState<{
    queroIr: string[];
    jaFui: string[];
    favoritos: string[];
  }>({ queroIr: [], jaFui: [], favoritos: [] });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Carrega dados do estabelecimento e avaliações reais
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const p = await getPlace(placeId);
        if (ativo && p) {
          setPlace(p);
        } else if (ativo && !place) {
          const found = SAMPLE_PLACES.find((s) => s.id === placeId) || SAMPLE_PLACES[0];
          setPlace(found);
        }
      } catch {
        if (ativo && !place) {
          const found = SAMPLE_PLACES.find((s) => s.id === placeId) || SAMPLE_PLACES[0];
          setPlace(found);
        }
      }

      try {
        const filtradas = await carregarReviewsDoLugar(placeId);
        if (ativo) {
          setReviews(filtradas);
        }
      } catch (err) {
        console.warn('Erro ao carregar avaliações:', err);
      }

      if (ativo) {
        setListas(obterListasUsuario(currentUser.uid));
        setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [placeId, currentUser.uid]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggleFavorito = () => {
    const added = alternarListaUsuario(currentUser.uid, 'favoritos', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Salvo nos seus restaurantes favoritos!' : 'Removido dos favoritos.');
  };

  const handleToggleQueroIr = () => {
    const added = alternarListaUsuario(currentUser.uid, 'queroIr', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Adicionado à lista Quero ir!' : 'Removido de Quero ir.');
  };

  const handleToggleJaFui = () => {
    const added = alternarListaUsuario(currentUser.uid, 'jaFui', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Marcado como Já fui!' : 'Removido de Já fui.');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place?.name || 'Restaurante no Vimo',
        text: `Confira ${place?.name} no Vimo`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copiado para a área de transferência!');
    }
  };

  const handleToggleLike = (revId: string, initialLikes = 0) => {
    const isLiked = !!likedReviews[revId];
    const currentCount = reviewLikesCount[revId] ?? initialLikes;
    setLikedReviews((prev) => ({ ...prev, [revId]: !isLiked }));
    setReviewLikesCount((prev) => ({
      ...prev,
      [revId]: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));
  };

  // Score do Vimo e do Google
  const scoreInfo = useMemo(() => {
    return obterScoreRestaurante(
      placeId,
      place?.googleRating || place?.rating || 4.6,
      place?.googleUserRatingCount || place?.reviewsCount || 100
    );
  }, [placeId, place, reviews.length]);

  // Histograma de 10 barras (0.5 a 5.0 com passo 0.5) baseado em reviews reais
  const histograma = useMemo(() => {
    const barras = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    const contagens: Record<number, number> = {};
    barras.forEach((b) => (contagens[b] = 0));

    reviews.forEach((r) => {
      const nota = Math.round((r.overall || 0) * 2) / 2;
      if (contagens[nota] !== undefined) {
        contagens[nota]++;
      }
    });

    const max = Math.max(1, ...Object.values(contagens));
    return barras.map((valor) => ({
      valor,
      quantidade: contagens[valor] || 0,
      porcentagem: ((contagens[valor] || 0) / max) * 100,
    }));
  }, [reviews]);

  // Galeria de fotos reais
  const todasFotos = useMemo(() => {
    const list: string[] = [];
    if (place?.photoUrl) list.push(place.photoUrl);
    reviews.forEach((r) => {
      (r.photos || []).forEach((f) => list.push(f));
      (r.peoplePhotos || []).forEach((f) => list.push(f));
      (r.menuPhotos || []).forEach((f) => list.push(f));
    });
    return Array.from(new Set(list));
  }, [place, reviews]);

  const fotosExibidas = mostrarTodasFotos ? todasFotos : todasFotos.slice(0, 8);

  // Amigos que já foram (autores de reviews ou companions aprovados)
  const amigosQueForam = useMemo(() => {
    const map = new Map<string, { uid: string; name: string; photo: string }>();
    reviews.forEach((r) => {
      if (r.uid !== currentUser.uid && !map.has(r.uid)) {
        map.set(r.uid, {
          uid: r.uid,
          name: r.authorName,
          photo: r.authorPhoto,
        });
      }
      (r.companions || []).forEach((c) => {
        if (c.uid !== currentUser.uid && !map.has(c.uid)) {
          map.set(c.uid, {
            uid: c.uid,
            name: c.name,
            photo: c.photo,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [reviews, currentUser.uid]);

  if (carregando && !place) {
    return (
      <div className="flex-1 min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-[var(--muted)]">Carregando detalhes...</p>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex-1 min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-6 text-center">
        <MapPin size={36} className="text-[var(--star)] mb-3" />
        <h3 className="font-bold text-base mb-1">Restaurante não encontrado</h3>
        <button
          type="button"
          onClick={onVoltar}
          className="mt-4 px-5 py-2.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] font-semibold text-xs shadow-xs cursor-pointer min-h-11"
        >
          Voltar para Explorar
        </button>
      </div>
    );
  }

  const isFavorito = listas.favoritos.includes(placeId);
  const isQueroIr = listas.queroIr.includes(placeId);
  const isJaFui = listas.jaFui.includes(placeId);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.name} ${place.address || ''}`
  )}`;
  const rotasUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${place.name} ${place.address || ''}`
  )}`;

  return (
    <div className="flex-1 min-h-screen bg-[var(--bg)] text-[var(--ink)] pb-24">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[var(--s1)] text-[var(--ink)] px-5 py-2.5 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-[var(--line)] animate-in fade-in slide-in-from-top-4">
          <Check size={14} className="text-[var(--star)]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =========================================================================
          1. HERO com foto, voltar, compartilhar, nome e categoria
         ========================================================================= */}
      <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full max-h-[420px] bg-[var(--s2)] overflow-hidden">
        {place.photoUrl ? (
          <img
            src={place.photoUrl}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
            <MapPin size={48} className="opacity-40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />

        {/* Botões do topo: Voltar e Compartilhar */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar para a tela anterior"
            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-md hover:bg-black/80 transition cursor-pointer min-h-11 min-w-11"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartilhar restaurante"
            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-md hover:bg-black/80 transition cursor-pointer min-h-11 min-w-11"
          >
            <Share2 size={17} />
          </button>
        </div>

        {/* Nome e categoria sobre a base da imagem */}
        <div className="absolute bottom-4 left-4 right-4 max-w-4xl mx-auto space-y-1 text-white">
          <span className="inline-block text-[12px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white border border-white/20">
            {place.tipo || 'Gastronomia'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            {place.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* =========================================================================
            2. AÇÕES: Avaliar (primário) e Quero ir (secundário) + 3 ícones em linha
           ========================================================================= */}
        <section className="bg-[var(--s1)] rounded-2xl p-4 border border-[var(--line)] shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Avaliar (Primário) */}
            <button
              type="button"
              onClick={() => onAvaliar(place)}
              className="flex-1 min-h-11 px-5 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-xs cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.4} />
              <span>Avaliar</span>
            </button>

            {/* Quero ir (Secundário) */}
            <button
              type="button"
              onClick={handleToggleQueroIr}
              className={`flex-1 min-h-11 px-5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                isQueroIr
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--s2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--primary)]'
              }`}
            >
              <Bookmark size={17} className={isQueroIr ? 'fill-current' : ''} />
              <span>{isQueroIr ? 'Quero ir (Salvo)' : 'Quero ir'}</span>
            </button>
          </div>

          {/* Três ícones em linha: Já fui, Favorito, Salvar */}
          <div className="flex items-center justify-around pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={handleToggleJaFui}
              aria-label="Marcar como Já fui"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer min-h-11 ${
                isJaFui
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Check size={18} strokeWidth={isJaFui ? 2.5 : 2} className={isJaFui ? 'text-[var(--primary)]' : ''} />
              <span>{isJaFui ? 'Já fui' : 'Marcar Já fui'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFavorito}
              aria-label="Salvar nos Favoritos"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer min-h-11 ${
                isFavorito
                  ? 'text-rose-500 font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Heart size={18} className={isFavorito ? 'fill-rose-500 text-rose-500' : ''} />
              <span>{isFavorito ? 'Favorito' : 'Favoritar'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleQueroIr}
              aria-label="Salvar em Quero ir"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer min-h-11 ${
                isQueroIr
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Bookmark size={18} className={isQueroIr ? 'fill-[var(--primary)] text-[var(--primary)]' : ''} />
              <span>Salvar</span>
            </button>
          </div>
        </section>

        {/* =========================================================================
            3. COMO CHEGAR: endereço + distância + Rotas e Ver no mapa
           ========================================================================= */}
        <section className="bg-[var(--s1)] rounded-2xl p-4 border border-[var(--line)] shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-[var(--star)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-[var(--ink)] mb-0.5">Como chegar</h2>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                {place.address || 'Endereço disponível no mapa'}
              </p>
              {place.bairro && (
                <span className="inline-block mt-1 text-[12px] font-medium text-[var(--muted)]">
                  Bairro: {place.bairro}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={rotasUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] hover:border-[var(--primary)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 text-[var(--ink)] transition"
            >
              <NavigationIcon size={16} className="text-[var(--primary)]" />
              <span>Rotas</span>
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] hover:border-[var(--primary)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 text-[var(--ink)] transition"
            >
              <MapIcon size={16} className="text-[var(--primary)]" />
              <span>Ver no mapa</span>
            </a>
          </div>
        </section>

        {/* =========================================================================
            4. FOTOS: até 8 miniaturas em grade de 4 colunas + "Ver todas"
           ========================================================================= */}
        {todasFotos.length > 0 && (
          <section className="bg-[var(--s1)] rounded-2xl p-4 border border-[var(--line)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Images size={16} className="text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--ink)]">
                  Fotos ({todasFotos.length})
                </h2>
              </div>
              {todasFotos.length > 8 && (
                <button
                  type="button"
                  onClick={() => setMostrarTodasFotos(!mostrarTodasFotos)}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  {mostrarTodasFotos ? 'Ver menos' : `Ver todas (${todasFotos.length})`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {fotosExibidas.map((foto, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFotoModal(foto)}
                  aria-label={`Ver foto ${idx + 1}`}
                  className="aspect-square rounded-xl overflow-hidden bg-[var(--s2)] border border-[var(--line)] group relative cursor-pointer"
                >
                  <img
                    src={foto}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            5. NOTAS: nota do Vimo em destaque (text-4xl em var(--star)) +
               histograma de 10 barras; nota do Google abaixo.
               Se não desbloqueado, mostra só "Em breve" e quanto falta.
           ========================================================================= */}
        <section className="bg-[var(--s1)] rounded-2xl p-5 border border-[var(--line)] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <h2 className="text-sm font-bold text-[var(--ink)]">Notas da comunidade</h2>
            {scoreInfo.vimoDesbloqueado && (
              <span className="text-xs font-medium text-[var(--muted)]">
                {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}
              </span>
            )}
          </div>

          {scoreInfo.vimoDesbloqueado ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-[var(--star)] tracking-tight">
                  {scoreInfo.vimoRating?.toFixed(1).replace('.', ',')}
                </div>
                <div>
                  <StarRating value={scoreInfo.vimoRating || 0} size={20} />
                  <p className="text-xs text-[var(--muted)] mt-0.5">Nota média do Vimo</p>
                </div>
              </div>

              {/* Histograma de 10 barras horizontais */}
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-semibold text-[var(--muted)] mb-1">
                  Distribuição de notas
                </div>
                {histograma.map((item) => (
                  <div key={item.valor} className="flex items-center gap-2 text-xs">
                    <span className="w-7 text-right text-[var(--muted)] font-medium">
                      {item.valor.toFixed(1).replace('.', ',')}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--s2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--star)] transition-all duration-300"
                        style={{ width: `${item.porcentagem}%` }}
                      />
                    </div>
                    <span className="w-5 text-left text-[var(--muted)]">
                      {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--star)]/15 text-[var(--star)]">
                  Em breve
                </span>
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Nota Vimo em andamento
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Faltam {Math.max(1, 5 - reviews.length)}{' '}
                {5 - reviews.length === 1 ? 'avaliação' : 'avaliações'} para desbloquear a nota
                oficial da comunidade Vimo.
              </p>
            </div>
          )}

          {/* Nota do Google em cinza menor abaixo */}
          <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-medium">Google Maps</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[var(--ink)]">
                {(place.googleRating || place.rating || 4.6).toFixed(1).replace('.', ',')}
              </span>
              <Star size={12} className="fill-[var(--star)] text-[var(--star)]" />
              <span>({place.googleUserRatingCount || place.reviewsCount || 0} avaliações)</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. AMIGOS QUE JÁ FORAM: até 5 avatares sobrepostos + "Ana, Bruno e mais 1"
           ========================================================================= */}
        <section className="bg-[var(--s1)] rounded-2xl p-4 border border-[var(--line)] shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-[var(--ink)]">Amigos que já foram</h2>
          {amigosQueForam.length > 0 ? (
            <div className="flex items-center gap-3 pt-1">
              {/* Avatares sobrepostos */}
              <div className="flex items-center -space-x-2">
                {amigosQueForam.slice(0, 5).map((amigo) => (
                  <button
                    key={amigo.uid}
                    type="button"
                    onClick={() => onAbrirPerfil(amigo.uid)}
                    aria-label={`Ver perfil de ${amigo.name}`}
                    className="w-8 h-8 rounded-full border-2 border-[var(--s1)] overflow-hidden transition hover:scale-110 cursor-pointer"
                  >
                    <img
                      src={amigo.photo}
                      alt={amigo.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Rótulo textual: "Ana, Bruno e mais 1" */}
              <div className="text-xs sm:text-sm text-[var(--muted)] truncate">
                {amigosQueForam.length === 1
                  ? amigosQueForam[0].name
                  : amigosQueForam.length === 2
                  ? `${amigosQueForam[0].name} e ${amigosQueForam[1].name}`
                  : amigosQueForam.length === 3
                  ? `${amigosQueForam[0].name}, ${amigosQueForam[1].name} e ${amigosQueForam[2].name}`
                  : `${amigosQueForam[0].name}, ${amigosQueForam[1].name} e mais ${
                      amigosQueForam.length - 2
                    }`}
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              Nenhum amigo visitou ainda. Seja o primeiro a registrar!
            </p>
          )}
        </section>

        {/* =========================================================================
            7. AVALIAÇÕES: cartões de review (texto, pratos, fotos)
           ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--ink)]">
              Avaliações ({reviews.length})
            </h2>
            <button
              type="button"
              onClick={() => onAvaliar(place)}
              className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
            >
              Adicionar avaliação
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-[var(--s1)] rounded-2xl p-8 border border-[var(--line)] text-center space-y-3">
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                Ainda não há avaliações para este lugar no Vimo.
              </p>
              <button
                type="button"
                onClick={() => onAvaliar(place)}
                className="px-5 py-2.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold shadow-xs cursor-pointer min-h-11"
              >
                Escrever a primeira crítica
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const isLiked = !!likedReviews[rev.id];
                const likesCount = reviewLikesCount[rev.id] ?? (rev.likesCount || 0);

                return (
                  <article
                    key={rev.id}
                    className="bg-[var(--s1)] rounded-2xl p-4 sm:p-5 border border-[var(--line)] space-y-3 shadow-2xs"
                  >
                    {/* Cabeçalho da review */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onAbrirPerfil(rev.uid)}
                          aria-label={`Ver perfil de ${rev.authorName}`}
                          className="w-10 h-10 rounded-full overflow-hidden border border-[var(--line)] cursor-pointer"
                        >
                          <img
                            src={rev.authorPhoto}
                            alt={rev.authorName}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => onAbrirPerfil(rev.uid)}
                            className="text-xs sm:text-sm font-bold text-[var(--ink)] hover:underline cursor-pointer block text-left"
                          >
                            {rev.authorName}
                          </button>
                          <span className="text-xs text-[var(--muted)] block">
                            {rev.authorHandle}
                          </span>
                        </div>
                      </div>

                      {/* Nota geral calculada da review */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--s2)] border border-[var(--line)]">
                        <Star size={13} className="fill-[var(--star)] text-[var(--star)]" />
                        <span className="text-xs font-bold text-[var(--star)]">
                          {(rev.overall || 0).toFixed(1).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    {/* Título e Texto da crítica */}
                    {rev.tituloReview && (
                      <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] leading-snug">
                        {rev.tituloReview}
                      </h3>
                    )}
                    {rev.text && (
                      <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
                        {rev.text}
                      </p>
                    )}

                    {/* Prato destaque e detalhes adicionais */}
                    {(rev.pratoDestaque || rev.voltaria || rev.precoPercepcao) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rev.pratoDestaque && (
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--ink)]">
                            Prato destaque: <strong>{rev.pratoDestaque}</strong>
                          </span>
                        )}
                        {rev.voltaria && (
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--ink)]">
                            Voltaria:{' '}
                            <strong>
                              {rev.voltaria === 'com_certeza'
                                ? 'Com certeza'
                                : rev.voltaria === 'talvez'
                                ? 'Talvez'
                                : 'Não'}
                            </strong>
                          </span>
                        )}
                        {rev.precoPercepcao && (
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--ink)]">
                            Preço: <strong>{rev.precoPercepcao}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Fotos da Review */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                        {rev.photos.map((fotoUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFotoModal(fotoUrl)}
                            aria-label={`Ver foto ${idx + 1} da avaliação`}
                            className="aspect-square rounded-xl overflow-hidden bg-[var(--s2)] border border-[var(--line)] cursor-pointer"
                          >
                            <img
                              src={fotoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Rodapé da Review: Curtidas e Comentários */}
                    <div className="flex items-center gap-4 pt-2 border-t border-[var(--line)] text-xs text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(rev.id, rev.likesCount || 0)}
                        aria-label="Curtir avaliação"
                        className={`flex items-center gap-1.5 transition cursor-pointer min-h-11 ${
                          isLiked ? 'text-[var(--star)] font-bold' : 'hover:text-[var(--ink)]'
                        }`}
                      >
                        <ThumbsUp size={14} className={isLiked ? 'fill-current' : ''} />
                        <span>{likesCount}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={14} />
                        <span>{rev.commentsCount || 0}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de foto em tela cheia */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={() => setFotoModal(null)}
            aria-label="Fechar foto ampliada"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition cursor-pointer min-h-11 min-w-11"
          >
            <X size={20} />
          </button>
          <img
            src={fotoModal}
            alt=""
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
