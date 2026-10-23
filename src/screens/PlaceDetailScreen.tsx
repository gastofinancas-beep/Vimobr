import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Check,
  Navigation as NavigationIcon,
  Map as MapIcon,
  Share2,
  Plus,
  MessageCircle,
  X,
  CalendarCheck,
  MoreHorizontal,
  MapPin,
  Clock,
  Phone,
  Globe,
  Instagram,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { NOMES_DIAS, faixasDoDia, lerHorario, situacaoAgora } from '../lib/horario';
import { getPlace, SAMPLE_PLACES, formatarPrecoLabel } from '../lib/places';
import {
  alternarListaUsuario,
  obterListasUsuario,
  carregarReviewsDoLugar,
  obterScoreRestaurante,
  alternarCurtida,
  verificarCurtida,
} from '../lib/reviews';
import { semBloqueados } from '../lib/moderacao';
import { MenuModeracao } from '../components/Moderacao';
import StarRating from '../components/StarRating';
import MascotMessage from '../components/MascotMessage';
import { Avatar, PlaceImage, Spinner, btn, card } from '../components/ui';
import { Mascote, type Reacao } from '../components/Mascote';
import { useEscape } from '../hooks/useEscape';

const TIPOS: Record<string, string> = {
  restaurant: 'Restaurante',
  cafe: 'Café',
  bakery: 'Padaria',
  bar: 'Bar',
};

const nota = (n: number) => n.toFixed(1).replace('.', ',');
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
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [moderando, setModerando] = useState<Review | null>(null);
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
  const [toastReacao, setToastReacao] = useState<Reacao>('sucesso');
  useEscape(() => setFotoModal(null), !!fotoModal);

  // Carrega dados do estabelecimento e avaliações reais
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const p = await getPlace(placeId);
        if (ativo && p) {
          setPlace(p);
        } else if (ativo && !place) {
          const found = SAMPLE_PLACES.find((s) => s.id === placeId);
          if (found) {
            setPlace(found);
          } else {
            setNaoEncontrado(true);
          }
        }
      } catch {
        if (ativo && !place) {
          const found = SAMPLE_PLACES.find((s) => s.id === placeId);
          if (found) {
            setPlace(found);
          } else {
            setNaoEncontrado(true);
          }
        }
      }

      try {
        const filtradas = semBloqueados(await carregarReviewsDoLugar(placeId), currentUser.uid);
        if (ativo) {
          setReviews(filtradas);
          const liked: Record<string, boolean> = {};
          filtradas.forEach((r) => {
            if (verificarCurtida(r.id, currentUser.uid)) liked[r.id] = true;
          });
          setLikedReviews(liked);
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

  const showToast = (msg: string, reacao: Reacao = 'sucesso') => {
    setToastMsg(msg);
    setToastReacao(reacao);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggleFavorito = () => {
    const added = alternarListaUsuario(currentUser.uid, 'favoritos', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Adicionado aos favoritos' : 'Removido dos favoritos', added ? 'apaixonado' : 'decepcionado');
  };

  const handleToggleQueroIr = () => {
    const added = alternarListaUsuario(currentUser.uid, 'queroIr', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Salvo em Quero ir' : 'Removido de Quero ir', added ? 'salvando' : 'decepcionado');
  };

  const handleToggleJaFui = () => {
    const added = alternarListaUsuario(currentUser.uid, 'jaFui', placeId);
    setListas(obterListasUsuario(currentUser.uid));
    showToast(added ? 'Marcado como Já fui' : 'Removido de Já fui', added ? 'confiante' : 'decepcionado');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place?.name || 'Restaurante no Vimo',
        text: `Confira ${place?.name} no Vimo`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(window.location.href)
        .then(() => showToast('Link copiado', 'compartilhando'))
        .catch(() => showToast('Não foi possível copiar o link', 'decepcionado'));
    }
  };

  const handleToggleLike = (revId: string, initialLikes = 0) => {
    const isLiked = !!likedReviews[revId];
    const currentCount = reviewLikesCount[revId] ?? initialLikes;
    const novoEstado = !isLiked;
    setLikedReviews((prev) => ({ ...prev, [revId]: novoEstado }));
    setReviewLikesCount((prev) => ({
      ...prev,
      [revId]: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));
    alternarCurtida(revId, currentUser.uid).catch(() => {
      // Reverte em caso de erro
      setLikedReviews((prev) => ({ ...prev, [revId]: isLiked }));
      setReviewLikesCount((prev) => ({ ...prev, [revId]: currentCount }));
    });
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
    (place?.photos || []).forEach((f) => list.push(f));
    reviews.forEach((r) => {
      (r.photos || []).forEach((f) => list.push(f));
      (r.peoplePhotos || []).forEach((f) => list.push(f));
      (r.menuPhotos || []).forEach((f) => list.push(f));
    });
    return Array.from(new Set(list));
  }, [place, reviews]);

  // Sem foto do lugar, a capa é a foto mais recente das avaliações do Vimo
  const capa = useMemo(() => {
    if (place?.photoUrl) return place.photoUrl;
    const comFoto = [...reviews].sort((a, b) => b.createdAt - a.createdAt).find((r) => r.photos?.length || r.peoplePhotos?.length);
    return comFoto?.photos?.[0] ?? comFoto?.peoplePhotos?.[0];
  }, [place, reviews]);

  const fotosExibidas = mostrarTodasFotos ? todasFotos : todasFotos.slice(0, 8);

  // Quantas vezes o usuário atual foi a este estabelecimento
  const minhasVisitas = useMemo(
    () => reviews.filter((r) => r.uid === currentUser.uid).length,
    [reviews, currentUser.uid]
  );

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
      <div className="flex-1 min-h-screen bg-bg">
        <Spinner label="Carregando lugar" className="pt-40" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex-1 min-h-screen bg-bg flex items-center justify-center p-6">
        <MascotMessage
          reaction="confuso"
          title="Lugar não encontrado"
          subtitle="Ele pode ter sido removido ou o link está incorreto."
          ctaLabel="Voltar"
          onCta={onVoltar}
        />
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

  // Só dados reais: sem nota ou contagem inventada
  const notaGoogle = place.notaExterna?.nota ?? place.googleRating ?? place.rating ?? null;
  const qtdGoogle = place.notaExterna?.total ?? place.googleUserRatingCount ?? place.reviewsCount ?? 0;
  const fonteNota = place.notaExterna?.fonte ?? 'Google';
  const tipo = place.tipo ? TIPOS[place.tipo] || place.tipo : null;
  const meta = [place.cuisine || tipo, place.bairro, place.priceLevel ? formatarPrecoLabel(place.priceLevel) : null].filter(Boolean);
  const maxHist = Math.max(1, ...histograma.map((h) => h.quantidade));
  const faltam = Math.max(0, 5 - reviews.length);

  const toggles = [
    { key: 'jafui', ativo: isJaFui, onClick: handleToggleJaFui, Icon: Check, label: 'Já fui', cor: 'text-primary' },
    { key: 'queroir', ativo: isQueroIr, onClick: handleToggleQueroIr, Icon: Bookmark, label: 'Quero ir', cor: 'text-primary' },
    { key: 'favorito', ativo: isFavorito, onClick: handleToggleFavorito, Icon: Heart, label: 'Favorito', cor: 'text-star' },
  ];

  const nomesAmigos =
    amigosQueForam.length === 1
      ? amigosQueForam[0].name
      : amigosQueForam.length === 2
      ? `${amigosQueForam[0].name} e ${amigosQueForam[1].name}`
      : amigosQueForam.length === 3
      ? `${amigosQueForam[0].name}, ${amigosQueForam[1].name} e ${amigosQueForam[2].name}`
      : `${amigosQueForam[0]?.name}, ${amigosQueForam[1]?.name} e mais ${amigosQueForam.length - 2}`;

  const botaoFoto =
    'w-10 h-10 rounded-full bg-white/95 text-[#101116] shadow-md flex items-center justify-center hover:bg-white transition-colors cursor-pointer';

  return (
    <div className="flex-1 min-h-screen bg-bg text-ink pb-28">
      {/* Aviso curto de confirmação */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-s1 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink shadow-lg ring-1 ring-line animate-in slide-in-from-top-2"
        >
          <Mascote key={toastMsg} reacao={toastReacao} tamanho={36} animacao="pular" className="bg-s2!" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Foto do lugar */}
      <div className="relative w-full max-w-4xl mx-auto">
        <PlaceImage
          src={capa}
          name={place.name}
          loading="eager"
          className="aspect-[4/3] sm:aspect-[21/9] max-h-[420px] w-full"
        />
        {/* Gradiente no topo para os botões flutuarem melhor */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4">
          <button type="button" onClick={onVoltar} aria-label="Voltar" className={botaoFoto}>
            <ArrowLeft size={19} strokeWidth={2} />
          </button>
          <button type="button" onClick={handleShare} aria-label="Compartilhar lugar" className={botaoFoto}>
            <Share2 size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      <main className="relative -mt-6 max-w-4xl mx-auto rounded-t-3xl bg-bg px-4">
        {/* Nome, categoria e nota em resumo */}
        <header className="pt-6">
          <h1 className="t-display text-ink">{place.name}</h1>
          {meta.length > 0 && <p className="mt-1 text-sm text-muted">{meta.join(' · ')}</p>}

          {(scoreInfo.vimoDesbloqueado || notaGoogle) && (
            <div className="mt-4 flex items-center gap-3">
              <span className="t-rating text-4xl text-ink">
                {nota(scoreInfo.vimoDesbloqueado ? scoreInfo.vimoRating || 0 : notaGoogle || 0)}
              </span>
              <div>
                <StarRating value={scoreInfo.vimoDesbloqueado ? scoreInfo.vimoRating || 0 : notaGoogle || 0} size={15} />
                <p className="t-meta mt-0.5">
                  {scoreInfo.vimoDesbloqueado
                    ? `${reviews.length} avaliações no VIMO`
                    : `${qtdGoogle.toLocaleString('pt-BR')} avaliações no ${fonteNota}`}
                </p>
              </div>
            </div>
          )}

          {minhasVisitas > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--s2)] border border-[var(--line)]">
              <CalendarCheck size={13} className="text-primary shrink-0" strokeWidth={2.2} />
              <span className="text-xs font-semibold text-ink-2">
                Você foi {minhasVisitas} {minhasVisitas === 1 ? 'vez' : 'vezes'}
              </span>
            </div>
          )}
        </header>

        {/* Ações */}
        <section aria-label="Ações" className="mt-5">
          <button type="button" onClick={() => onAvaliar(place)} className={`${btn.primary} w-full`}>
            <Plus size={18} strokeWidth={2.2} />
            Registrar ida
          </button>
          <div className="mt-4 grid grid-cols-4 gap-1">
            {toggles.map(({ key, ativo, onClick, Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                aria-pressed={ativo}
                className="group flex flex-col items-center gap-1.5 py-1 text-xs font-semibold text-ink-2 cursor-pointer"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all group-active:scale-90 ${
                    ativo ? (key === 'favorito' ? 'bg-like text-white' : 'bg-primary text-on-primary') : 'bg-s1 text-ink shadow-sm ring-1 ring-line'
                  }`}
                >
                  <Icon size={20} strokeWidth={ativo ? 2.4 : 1.9} className={ativo && key !== 'jafui' ? 'fill-current' : ''} />
                </span>
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartilhar"
              className="group flex flex-col items-center gap-1.5 py-1 text-xs font-semibold text-ink-2 cursor-pointer"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-s1 text-ink shadow-sm ring-1 ring-line transition-transform group-active:scale-90">
                <Share2 size={19} strokeWidth={1.9} />
              </span>
              Compartilhar
            </button>
          </div>
        </section>

        {/* Informações do lugar (endereço, horário, contato e serviços) */}
        <InformacoesLugar place={place} rotasUrl={rotasUrl} mapaUrl={googleMapsUrl} />

        {/* Fotos */}
        {todasFotos.length > 0 && (
          <section aria-labelledby="titulo-fotos" className={`mt-4 ${card} p-4`}>
            <div className="flex items-baseline justify-between">
              <h2 id="titulo-fotos" className="t-section text-ink">
                Fotos <span className="font-medium text-muted tabular">{todasFotos.length}</span>
              </h2>
              {todasFotos.length > 8 && (
                <button
                  type="button"
                  onClick={() => setMostrarTodasFotos(!mostrarTodasFotos)}
                  className="text-sm font-medium text-primary cursor-pointer"
                >
                  {mostrarTodasFotos ? 'Ver menos' : 'Ver todas'}
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {fotosExibidas.map((foto, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFotoModal(foto)}
                  aria-label={`Ver foto ${idx + 1}`}
                  className="aspect-square overflow-hidden rounded-sm bg-s2 cursor-pointer"
                >
                  <PlaceImage src={foto} name="" className="h-full w-full" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Notas */}
        <section aria-labelledby="titulo-notas" className={`mt-4 ${card} p-4`}>
          <h2 id="titulo-notas" className="t-section text-ink">Notas</h2>

          {scoreInfo.vimoDesbloqueado ? (
            <div className="mt-3 flex items-end gap-4">
              <div className="shrink-0">
                <div className="t-rating text-3xl text-ink">{nota(scoreInfo.vimoRating || 0)}</div>
                <p className="t-meta">média VIMO</p>
              </div>
              {/* Distribuição: barras verticais de ½ a 5 estrelas */}
              <div className="flex-1">
                <div className="flex h-14 items-end gap-[3px]" aria-label="Distribuição das notas">
                  {histograma.map((h) => (
                    <div
                      key={h.valor}
                      title={`${nota(h.valor)}: ${h.quantidade}`}
                      className="flex-1 rounded-t-[2px] bg-s3"
                      style={{ height: `${Math.max(6, (h.quantidade / maxHist) * 100)}%` }}
                    >
                      <div className="h-full w-full rounded-t-[2px] bg-primary/70" style={{ opacity: h.quantidade ? 1 : 0 }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-2xs text-muted">
                  <span>½</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <Mascote reacao="pensativo" tamanho={52} />
              <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-2">
                A nota VIMO aparece a partir de 5 avaliações.{' '}
                <span className="text-muted">
                  {faltam === 1 ? 'Falta 1.' : `Faltam ${faltam}.`}
                </span>
              </p>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < reviews.length ? 'bg-primary' : 'bg-s3'}`} />
                ))}
              </div>
              </div>
            </div>
          )}

          {notaGoogle !== null && (
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">{fonteNota}</span>
              <span className="flex items-center gap-2">
                <span className="t-rating text-ink">{nota(notaGoogle)}</span>
                <StarRating value={notaGoogle} size={12} />
                <span className="text-muted tabular">({qtdGoogle.toLocaleString('pt-BR')})</span>
              </span>
            </div>
          )}
        </section>

        {/* Amigos que já foram */}
        <section aria-labelledby="titulo-amigos" className={`mt-4 ${card} p-4`}>
          <h2 id="titulo-amigos" className="t-section text-ink">Amigos que já foram</h2>
          {amigosQueForam.length > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex -space-x-2">
                {amigosQueForam.slice(0, 5).map((amigo) => (
                  <button
                    key={amigo.uid}
                    type="button"
                    onClick={() => onAbrirPerfil(amigo.uid)}
                    aria-label={`Ver perfil de ${amigo.name}`}
                    className="rounded-full ring-2 ring-bg cursor-pointer"
                  >
                    <Avatar src={amigo.photo} name={amigo.name} size={30} />
                  </button>
                ))}
              </div>
              <p className="truncate text-sm text-ink-2">{nomesAmigos}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">Nenhum amigo registrou ida aqui ainda.</p>
          )}
        </section>

        {/* Avaliações */}
        <section aria-labelledby="titulo-avaliacoes" className={`mt-4 ${card} p-4`}>
          <div className="flex items-baseline justify-between">
            <h2 id="titulo-avaliacoes" className="t-section text-ink">
              Avaliações <span className="font-medium text-muted tabular">{reviews.length}</span>
            </h2>
          </div>

          {reviews.length === 0 ? (
            <MascotMessage
              reaction="incentivando"
              title="Ninguém avaliou ainda"
              subtitle="Conte como foi e ajude quem está decidindo onde comer."
              ctaLabel="Avaliar este lugar"
              onCta={() => onAvaliar(place)}
            />
          ) : (
            <div className="mt-1 divide-y divide-line">
              {reviews.map((rev) => {
                const isLiked = !!likedReviews[rev.id];
                const likesCount = reviewLikesCount[rev.id] ?? (rev.likesCount || 0);
                const detalhes = [
                  rev.voltaria
                    ? `Voltaria: ${rev.voltaria === 'com_certeza' ? 'com certeza' : rev.voltaria === 'talvez' ? 'talvez' : 'não'}`
                    : null,
                  rev.precoPercepcao ? `Preço: ${rev.precoPercepcao}` : null,
                ].filter(Boolean);

                return (
                  <article key={rev.id} className="py-5">
                    <header className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onAbrirPerfil(rev.uid)}
                        className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer"
                      >
                        <Avatar src={rev.authorPhoto} name={rev.authorName} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{rev.authorName}</span>
                          {rev.authorHandle && <span className="block t-meta">{rev.authorHandle}</span>}
                        </span>
                      </button>
                      <span className="flex shrink-0 items-center gap-1">
                        <StarRating value={rev.overall || 0} size={13} />
                        {rev.uid !== currentUser.uid && (
                          <button
                            type="button"
                            onClick={() => setModerando(rev)}
                            aria-label={`Opções da avaliação de ${rev.authorName}`}
                            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-s2 cursor-pointer"
                          >
                            <MoreHorizontal size={18} strokeWidth={1.8} />
                          </button>
                        )}
                      </span>
                    </header>

                    {rev.tituloReview && <h3 className="mt-3 text-base font-semibold text-ink">{rev.tituloReview}</h3>}
                    {rev.text && <p className="mt-2 t-body text-ink-2 whitespace-pre-line">{rev.text}</p>}

                    {rev.pratoDestaque && (
                      <p className="mt-2 text-sm text-muted">
                        Prato destaque: <span className="font-medium text-ink">{rev.pratoDestaque}</span>
                      </p>
                    )}
                    {detalhes.length > 0 && <p className="mt-1 text-sm text-muted">{detalhes.join(' · ')}</p>}

                    {rev.photos && rev.photos.length > 0 && (
                      <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                        {rev.photos.map((fotoUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFotoModal(fotoUrl)}
                            aria-label={`Ver foto ${idx + 1} da avaliação`}
                            className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-s2 cursor-pointer"
                          >
                            <PlaceImage src={fotoUrl} name="" className="h-full w-full" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-5 text-sm text-muted">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(rev.id, rev.likesCount || 0)}
                        aria-pressed={isLiked}
                        aria-label={`Curtir. ${likesCount} curtidas`}
                        className={`flex min-h-11 items-center gap-1.5 tabular transition-colors cursor-pointer ${
                          isLiked ? 'text-star' : 'hover:text-ink'
                        }`}
                      >
                        <Heart size={17} strokeWidth={1.8} className={isLiked ? 'fill-star' : ''} />
                        {likesCount}
                      </button>
                      <span className="flex items-center gap-1.5 tabular">
                        <MessageCircle size={17} strokeWidth={1.8} />
                        {rev.commentsCount || 0}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Foto em tela cheia */}
      {moderando && (
        <MenuModeracao
          alvo={{ tipo: 'avaliacao', id: moderando.id, uid: moderando.uid, nome: moderando.authorName || 'Usuário', foto: moderando.authorPhoto }}
          meuUid={currentUser.uid}
          onFechar={() => setModerando(null)}
          onFeito={(acao) => {
            const alvo = moderando;
            setReviews((prev) => prev.filter((r) => (acao === 'bloqueado' ? r.uid !== alvo.uid : r.id !== alvo.id)));
          }}
        />
      )}

      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in"
        >
          <button
            type="button"
            onClick={() => setFotoModal(null)}
            aria-label="Fechar foto"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
          <img src={fotoModal} alt="" className="max-h-[85vh] max-w-full rounded-md object-contain" />
        </div>
      )}
    </div>
  );
}

function InformacoesLugar({ place, rotasUrl, mapaUrl }: { place: Place; rotasUrl: string; mapaUrl: string }) {
  const [semanaAberta, setSemanaAberta] = useState(false);
  const semana = lerHorario(place.horario);
  const agora = semana ? situacaoAgora(semana) : null;
  const hoje = new Date().getDay();
  const serv = place.servicos;
  const servicos = serv
    ? [
        serv.noLocal && 'Refeição no local',
        serv.retirada && 'Retirada',
        serv.entrega && 'Entrega',
        serv.areaExterna && 'Área externa',
        serv.acessivel && 'Acessível',
      ].filter((x): x is string => !!x)
    : [];
  const telefone = place.phone?.split(';')[0].trim();
  const linha = 'flex items-start gap-3 py-3';
  const icone = 'mt-0.5 shrink-0 text-primary';

  return (
    <section aria-labelledby="titulo-info" className={`mt-4 ${card} px-4 pt-4 pb-1`}>
      <h2 id="titulo-info" className="t-section text-ink">Informações</h2>
      {servicos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {servicos.map((sv) => (
            <li key={sv} className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <Check size={14} strokeWidth={2.4} className="text-primary" />
              {sv}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 divide-y divide-line">
        <div className={linha}>
          <MapPin size={18} strokeWidth={1.9} className={icone} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{place.address || 'Endereço disponível no mapa'}</p>
            <div className="mt-2.5 flex gap-2">
              <a href={rotasUrl} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} h-9 flex-1 text-[13px]`}>
                <NavigationIcon size={14} strokeWidth={2} />
                Rotas
              </a>
              <a href={mapaUrl} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} h-9 flex-1 text-[13px]`}>
                <MapIcon size={14} strokeWidth={2} />
                Ver no mapa
              </a>
            </div>
          </div>
        </div>

        {place.horario && (
          <div className={linha}>
            <Clock size={18} strokeWidth={1.9} className={icone} />
            <div className="min-w-0 flex-1">
              {semana && agora ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSemanaAberta((v) => !v)}
                    aria-expanded={semanaAberta}
                    className="flex w-full items-center gap-1.5 text-left text-sm cursor-pointer"
                  >
                    <span className={`font-semibold ${agora.aberto ? 'text-primary' : 'text-danger'}`}>
                      {agora.aberto ? 'Aberto' : 'Fechado'}
                    </span>
                    <span className="text-ink-2">· {agora.texto}</span>
                    <ChevronDown size={15} className={`ml-auto shrink-0 text-muted transition-transform ${semanaAberta ? 'rotate-180' : ''}`} />
                  </button>
                  {semanaAberta && (
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <React.Fragment key={d}>
                          <dt className={d === hoje ? 'font-semibold text-ink' : 'text-ink-2'}>{NOMES_DIAS[d]}</dt>
                          <dd className={`tabular ${d === hoje ? 'font-semibold text-ink' : 'text-ink-2'}`}>{faixasDoDia(semana[d])}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-2">{place.horario}</p>
              )}
            </div>
          </div>
        )}

        {telefone && (
          <a href={`tel:${telefone.replace(/[^\d+]/g, '')}`} className={`${linha} cursor-pointer`}>
            <Phone size={18} strokeWidth={1.9} className={icone} />
            <span className="text-sm text-ink">{telefone}</span>
          </a>
        )}
        {place.site && (
          <a href={place.site} target="_blank" rel="noopener noreferrer" className={`${linha} cursor-pointer`}>
            <Globe size={18} strokeWidth={1.9} className={icone} />
            <span className="min-w-0 truncate text-sm text-ink">{place.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
          </a>
        )}
        {place.urlFonte && place.id.startsWith('yelp-') && (
          <a href={place.urlFonte} target="_blank" rel="noopener noreferrer" className={`${linha} cursor-pointer`}>
            <ExternalLink size={18} strokeWidth={1.9} className={icone} />
            <span className="text-sm text-ink">Dados e fotos do Yelp</span>
          </a>
        )}
        {place.instagram && (
          <a href={`https://instagram.com/${place.instagram}`} target="_blank" rel="noopener noreferrer" className={`${linha} cursor-pointer`}>
            <Instagram size={18} strokeWidth={1.9} className={icone} />
            <span className="text-sm text-ink">@{place.instagram}</span>
          </a>
        )}
      </div>
    </section>
  );
}
