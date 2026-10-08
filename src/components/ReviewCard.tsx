import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Check,
  Share2,
  Users,
  UserCheck,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  User,
  Star,
} from 'lucide-react';
import StarRating from './StarRating';
import PlacePlaceholder from './PlacePlaceholder';
import { photoUrl } from '../lib/places';
import type { Comment, Review, CompanionStatus } from '../types';

export default function ReviewCard({
  r,
  previa = [],
  seguindo,
  isOwner,
  currentUserUid,
  onSeguir,
  onCurtir,
  onComentarios,
  onAbrirLugar,
  onAbrirPerfil,
  onSalvar,
  salvo,
  onCompartilhar,
  onResponderCompanheiro,
}: {
  r: Review;
  previa?: Comment[];
  seguindo: boolean;
  isOwner?: boolean;
  currentUserUid?: string;
  onSeguir: () => void;
  onCurtir: () => void;
  onComentarios: () => void;
  onAbrirLugar?: (placeId: string) => void;
  onAbrirPerfil?: (uid: string) => void;
  onSalvar?: () => void;
  salvo?: boolean;
  onCompartilhar?: () => void;
  onResponderCompanheiro?: (reviewId: string, resposta: CompanionStatus) => void;
}) {
  const [fotoIndex, setFotoIndex] = useState(0);
  const [mostrarTagsFoto, setMostrarTagsFoto] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [animandoCurtida, setAnimandoCurtida] = useState(false);
  const [animandoSalvo, setAnimandoSalvo] = useState(false);

  const handleCurtirComAnimacao = () => {
    setAnimandoCurtida(true);
    setTimeout(() => setAnimandoCurtida(false), 500);
    onCurtir();
  };

  const handleSalvarComAnimacao = () => {
    setAnimandoSalvo(true);
    setTimeout(() => setAnimandoSalvo(false), 500);
    onSalvar?.();
  };

  // Lista combinada de todas as fotos da review com tipo categorizado
  const listaFotos: { url: string; tipo: 'prato' | 'pessoas' | 'cardapio' }[] = [
    ...(r.photos || []).map((url) => ({ url, tipo: 'prato' as const })),
    ...(r.peoplePhotos || []).map((url) => ({ url, tipo: 'pessoas' as const })),
    ...(r.menuPhotos || []).map((url) => ({ url, tipo: 'cardapio' as const })),
  ];
  if (listaFotos.length === 0 && (r.placePhotoUrl || r.placePhotoName)) {
    const fallback = r.placePhotoUrl || photoUrl(r.placePhotoName, 900);
    if (fallback) listaFotos.push({ url: fallback, tipo: 'prato' });
  }

  const fotoAtualItem = listaFotos[fotoIndex];
  const fotoAtual = fotoAtualItem?.url || photoUrl(r.placePhotoName, 900);

  // Companheiro(s) marcados nesta avaliação
  const companheiros = r.companions || [];
  const primeiroCompanheiro = companheiros[0];
  const temCompanheiro = !!primeiroCompanheiro;
  const isCoautor = primeiroCompanheiro?.status === 'aprovado_coautor';

  // Verifica se o usuário logado foi marcado e está com resposta pendente
  const meuConvitePendente = companheiros.find(
    (c) => c.uid === currentUserUid && c.status === 'pendente'
  );

  return (
    <article className="overflow-hidden rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition duration-200">
      {/* Header Estilo Feed do Instagram (Collab / Co-autoria com 2 Perfis) */}
      <header className="flex items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Duplo Avatar estilo Instagram Collab */}
          {temCompanheiro ? (
            <div className="relative flex items-center shrink-0 pr-2">
              {/* Avatar do Autor Principal */}
              <button
                type="button"
                onClick={() => onAbrirPerfil?.(r.uid)}
                className="relative z-10 transition-transform hover:scale-105 focus:outline-none"
                title={`Ver perfil de ${r.authorName}`}
              >
                <img
                  src={r.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${r.authorName}`}
                  alt={r.authorName}
                  className="h-11 w-11 rounded-full ring-2 ring-amber-400/60 object-cover bg-s2 shadow-xs"
                />
              </button>

              {/* Avatar do Companheiro Marcado (Sobreposto) */}
              <button
                type="button"
                onClick={() => onAbrirPerfil?.(primeiroCompanheiro.uid)}
                className="relative -ml-4 z-20 transition-transform hover:scale-110 focus:outline-none"
                title={`Ver perfil de ${primeiroCompanheiro.name}`}
              >
                <img
                  src={primeiroCompanheiro.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${primeiroCompanheiro.name}`}
                  alt={primeiroCompanheiro.name}
                  className={`h-11 w-11 rounded-full ring-2 ring-white dark:ring-[#18181B] object-cover bg-s2 shadow-md ${
                    isCoautor ? 'ring-amber-400' : ''
                  }`}
                />
                {isCoautor && (
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles size={9} />
                  </span>
                )}
              </button>
            </div>
          ) : (
            /* Avatar Único */
            <button
              type="button"
              onClick={() => onAbrirPerfil?.(r.uid)}
              className="relative shrink-0 text-left focus:outline-none transition-transform hover:scale-105"
            >
              <img
                src={r.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${r.authorName}`}
                alt={r.authorName}
                className="h-12 w-12 rounded-full ring-2 ring-amber-400/40 object-cover shadow-xs bg-s2"
              />
            </button>
          )}

          {/* Nomes dos 2 Perfis estilo Instagram ("pedrootavio e biaprados") */}
          <div className="min-w-0 flex-1">
            {temCompanheiro ? (
              <div>
                <div className="flex items-center flex-wrap gap-1 leading-snug">
                  <button
                    type="button"
                    onClick={() => onAbrirPerfil?.(r.uid)}
                    className="font-bold text-ink hover:text-accent transition text-[13px] truncate"
                  >
                    {r.authorName.split(' ')[0]}
                  </button>
                  <span className="text-muted text-xs font-normal">e</span>
                  <button
                    type="button"
                    onClick={() => onAbrirPerfil?.(primeiroCompanheiro.uid)}
                    className="font-bold text-ink hover:text-accent transition text-[13px] truncate"
                  >
                    {primeiroCompanheiro.name.split(' ')[0]}
                  </button>
                  {isCoautor && (
                    <span className="text-[12px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full ml-1">
                      Collab
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium">{r.authorHandle}</span>
                  <span>·</span>
                  <span className="font-medium">{primeiroCompanheiro.handle}</span>
                  <span>·</span>
                  <span>{tempo(r.createdAt)}</span>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => onAbrirPerfil?.(r.uid)}
                  className="font-bold text-ink hover:text-accent transition truncate block text-left text-sm"
                >
                  {r.authorName}
                </button>
                <div className="truncate text-xs text-muted mt-0.5">
                  <span>{r.authorHandle}</span> · {r.cityName} · {tempo(r.createdAt)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Seguir */}
        {!isOwner && (
          <button
            type="button"
            onClick={onSeguir}
            className={`h-8 rounded-full px-3.5 text-xs font-semibold transition flex items-center gap-1 shrink-0 ${
              seguindo
                ? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
                : 'bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-xs active:scale-95'
            }`}
          >
            {seguindo ? (
              <>
                <Check size={13} /> Seguindo
              </>
            ) : (
              'Seguir'
            )}
          </button>
        )}
      </header>

      {/* Convite Interativo para o usuário aceitar Co-autoria / Presença */}
      {meuConvitePendente && (
        <div className="mx-4 mb-3 rounded-2xl border border-accent/40 bg-accent/15 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Users size={16} className="text-accent shrink-0" />
            <span>{r.authorName} marcou você nesta avaliação!</span>
          </div>
          <p className="text-[11px] text-[#DDD3C4] leading-relaxed">
            Como você deseja aparecer nesta visita a <b>{r.placeName}</b>?
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onResponderCompanheiro?.(r.id, 'aprovado_coautor')}
              className="px-3 py-1.5 rounded-xl bg-accent text-bg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 shadow-sm transition"
            >
              <BookOpen size={13} />
              <span>Publicar no meu Diário (Co-autoria)</span>
            </button>
            <button
              type="button"
              onClick={() => onResponderCompanheiro?.(r.id, 'aprovado_presenca')}
              className="px-3 py-1.5 rounded-xl border border-line bg-s2 text-ink text-xs font-semibold flex items-center gap-1.5 hover:border-accent transition"
            >
              <UserCheck size={13} className="text-accent" />
              <span>Apenas confirmar presença</span>
            </button>
            <button
              type="button"
              onClick={() => onResponderCompanheiro?.(r.id, 'recusado')}
              className="px-2.5 py-1.5 rounded-xl text-muted text-xs hover:text-red-400 transition"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Título editorial da avaliação se houver */}
      {r.tituloReview && (
        <h4 className="px-4 pb-1.5 font-bold text-sm sm:text-base text-ink">
          “{r.tituloReview}”
        </h4>
      )}

      {/* Citação da avaliação em tipografia Fraunces */}
      <p className="px-4 pb-3 font-display text-[16px] sm:text-[18px] italic leading-snug text-ink selection:bg-accent/20">
        “{r.text}”
      </p>

      {/* Selo do Veredito & Destaques Críticos */}
      {(r.veredito || r.pratoDestaque || r.pontoFraco) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 text-xs">
          {r.veredito && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-400/30">
              {r.veredito === 'imperdivel' && 'Imperdível / Obra-prima'}
              {r.veredito === 'recomendado' && 'Muito Recomendado'}
              {r.veredito === 'vale_a_pena' && 'Vale a Pena'}
              {r.veredito === 'regular' && 'Regular'}
              {r.veredito === 'superestimado' && 'Superestimado'}
              {r.veredito === 'nao_recomendo' && 'Não Recomendo'}
            </span>
          )}

          {r.pratoDestaque && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <b>Pedir:</b> {r.pratoDestaque}
            </span>
          )}

          {r.pratoEvitar && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
              <b>Evitar:</b> {r.pratoEvitar}
            </span>
          )}
        </div>
      )}

      {/* Pratos Individuais Avaliados (se houver) */}
      {r.pratosAvaliados && r.pratosAvaliados.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {r.pratosAvaliados.map((prato, i) => (
            <span
              key={prato.id || i}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-s2 border border-line text-[11px]"
            >
              <span className="font-semibold text-ink">{prato.nome}</span>
              <span className="text-amber-500 font-bold font-sans flex items-center gap-0.5">
                <Star size={9} className="fill-amber-500" />
                <span>{prato.nota.toFixed(1)}</span>
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Foto(s) estilo Instagram com Carrossel e Marcação de Pessoas sobre a Imagem */}
      <div className="relative group bg-black/40 overflow-hidden select-none">
        {fotoAtual && !imgError ? (
          <img
            src={fotoAtual}
            alt={r.placeName}
            onError={() => setImgError(true)}
            onClick={() => {
              if (temCompanheiro) {
                setMostrarTagsFoto((prev) => !prev);
              } else {
                onAbrirLugar?.(r.placeId);
              }
            }}
            className="h-[280px] sm:h-[320px] w-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-[1.01]"
          />
        ) : (
          <PlacePlaceholder name={r.placeName} className="h-[280px] sm:h-[320px] w-full" />
        )}

        {/* Setas de Navegação do Carrossel de Fotos se houver múltiplas */}
        {listaFotos.length > 1 && (
          <>
            {fotoIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFotoIndex((prev) => Math.max(0, prev - 1));
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/70 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition shadow-lg z-20"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {fotoIndex < listaFotos.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFotoIndex((prev) => Math.min(listaFotos.length - 1, prev + 1));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/70 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition shadow-lg z-20"
                aria-label="Próxima foto"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {/* Badge de Categoria da Foto (Prato vs Pessoas vs Cardápio) sem emojis */}
            <div className="absolute top-3 left-3 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow border border-white/10 z-10 flex items-center gap-1">
              {fotoAtualItem?.tipo === 'pessoas' ? (
                <>
                  <Users size={12} className="text-accent" />
                  <span>Pessoas & Momentos</span>
                </>
              ) : fotoAtualItem?.tipo === 'cardapio' ? (
                <>
                  <BookOpen size={12} className="text-accent" />
                  <span>Cardápio</span>
                </>
              ) : (
                <>
                  <span>Prato</span>
                </>
              )}
            </div>

            {/* Contador de Fotos (Ex: 1/3) no topo direito */}
            <div className="absolute top-3 right-3 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow z-10">
              {fotoIndex + 1}/{listaFotos.length}
            </div>

            {/* Pontos Indicadores de Paginação do Carrossel */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {listaFotos.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === fotoIndex ? 'w-4 bg-accent' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Ícone de Pessoa Marcada no canto inferior esquerdo */}
        {temCompanheiro && (
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMostrarTagsFoto((prev) => !prev);
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white backdrop-blur-md px-2.5 py-1 text-xs font-semibold shadow-lg border border-white/15 transition transform active:scale-95"
              title="Toque para ver pessoas marcadas nesta foto"
            >
              <User size={13} className="text-accent" />
              <span>{primeiroCompanheiro.name.split(' ')[0]}</span>
              {mostrarTagsFoto ? (
                <span className="text-[12px] text-accent">▲</span>
              ) : (
                <span className="text-[12px] text-white/70">▼</span>
              )}
            </button>
          </div>
        )}

        {/* Balão Flutuante de Marcação sobre a Foto */}
        {temCompanheiro && mostrarTagsFoto && (
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="w-0 h-0 border-x-6 border-x-transparent border-b-6 border-b-black/90 mx-auto -mb-0.5" />
              <button
                type="button"
                onClick={() => onAbrirPerfil?.(primeiroCompanheiro.uid)}
                className="flex items-center gap-2 rounded-2xl bg-black/90 backdrop-blur-md px-3.5 py-2 text-white shadow-2xl border border-white/20 hover:border-accent transition group"
              >
                <img
                  src={primeiroCompanheiro.photo}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover border border-accent"
                />
                <div className="text-left">
                  <p className="text-xs font-bold text-white group-hover:text-accent transition flex items-center gap-1">
                    <span>{primeiroCompanheiro.name}</span>
                    {isCoautor && <Sparkles size={11} className="text-accent" />}
                  </p>
                  <p className="text-[12px] text-[#D0C7B8]">{primeiroCompanheiro.handle}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Gradiente inferior com Nome do Restaurante e Nota */}
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-10 cursor-pointer"
          onClick={() => onAbrirLugar?.(r.placeId)}
        >
          <div className="font-display text-lg sm:text-xl text-white drop-shadow-sm flex items-center justify-between">
            <span className="truncate hover:text-accent transition">{r.placeName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={r.overall} size={15} />
            <b className="text-xs sm:text-[13px] text-accent font-bold">
              {r.overall.toFixed(1).replace('.', ',')}
            </b>
            {r.visitedAt && (
              <span className="text-[11px] text-white/70 ml-auto">
                {new Date(r.visitedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Linha com as 5 notas críticas por critério: Entrada, Prato Principal, Ambiente, Atendimento, Bebidas */}
      <div className="px-4 pt-3 pb-1 text-[11px] text-muted border-b border-line/40 flex flex-wrap gap-x-3.5 gap-y-1.5">
        {(r.notaEntrada !== undefined || r.ratings?.entrada !== undefined) && (
          <span className="flex items-center gap-1">
            <span>Entrada</span>
            <strong className="text-ink font-sans">{fmt(r.notaEntrada ?? r.ratings?.entrada ?? 4.5)}</strong>
          </span>
        )}
        {(r.notaPratoPrincipal !== undefined || r.ratings?.pratoPrincipal !== undefined) && (
          <span className="flex items-center gap-1">
            <span>Principal</span>
            <strong className="text-ink font-sans">{fmt(r.notaPratoPrincipal ?? r.ratings?.pratoPrincipal ?? 4.8)}</strong>
          </span>
        )}
        {(r.notaAmbiente !== undefined || r.ratings?.ambiente !== undefined) && (
          <span className="flex items-center gap-1">
            <span>Ambiente</span>
            <strong className="text-ink font-sans">{fmt(r.notaAmbiente ?? r.ratings?.ambiente ?? 4.5)}</strong>
          </span>
        )}
        {(r.notaAtendimento !== undefined || r.notaServico !== undefined || r.ratings?.atendimento !== undefined) && (
          <span className="flex items-center gap-1">
            <span>Atendimento</span>
            <strong className="text-ink font-sans">{fmt(r.notaAtendimento ?? r.notaServico ?? r.ratings?.atendimento ?? 4.5)}</strong>
          </span>
        )}
        {(r.notaBebidas !== undefined || r.ratings?.bebidas !== undefined) && (
          <span className="flex items-center gap-1">
            <span>Bebidas</span>
            <strong className="text-ink font-sans">{fmt(r.notaBebidas ?? r.ratings?.bebidas ?? 4.5)}</strong>
          </span>
        )}
      </div>

      {/* Ações (curtir, comentar, compartilhar, salvar) */}
      <div className="flex items-center px-4 py-1 text-ink">
        <button
          type="button"
          onClick={handleCurtirComAnimacao}
          className={`flex h-11 items-center gap-1.5 pr-4 text-sm font-medium transition active:scale-95 cursor-pointer ${
            r.userLiked ? 'text-red-500 font-bold' : 'text-muted hover:text-ink'
          }`}
          aria-label="Curtir"
        >
          <Heart
            size={20}
            className={`${r.userLiked ? 'fill-red-500 text-red-500' : ''} ${
              animandoCurtida ? 'animate-heart-pop' : ''
            }`}
          />
          <span>{r.likesCount}</span>
        </button>

        <button
          type="button"
          onClick={onComentarios}
          className="flex h-11 items-center gap-1.5 pr-4 text-sm font-medium text-muted hover:text-ink transition active:scale-95 cursor-pointer"
          aria-label="Comentários"
        >
          <MessageCircle size={20} />
          <span>{r.commentsCount}</span>
        </button>

        {(isOwner || (currentUserUid && r.uid === currentUserUid)) && onCompartilhar && (
          <button
            type="button"
            onClick={onCompartilhar}
            className="flex h-11 items-center gap-1.5 pr-3 text-sm font-medium text-muted hover:text-accent transition active:scale-95 cursor-pointer"
            aria-label="Compartilhar"
            title="Compartilhar minha avaliação"
          >
            <Share2 size={19} />
            <span className="text-xs hidden sm:inline">Compartilhar</span>
          </button>
        )}

        <span className="flex-1" />

        <button
          type="button"
          onClick={handleSalvarComAnimacao}
          aria-label="Salvar na lista"
          className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 cursor-pointer ${
            salvo ? 'text-accent' : 'text-muted hover:text-ink'
          }`}
        >
          <Bookmark
            size={20}
            className={`${salvo ? 'fill-accent text-accent' : ''} ${
              animandoSalvo ? 'animate-bookmark-pop' : ''
            }`}
          />
        </button>
      </div>

      {/* Prévia de comentários & campo rápido */}
      <div className="space-y-2.5 px-4 pb-4">
        {previa.slice(0, 2).map((c) => (
          <div key={c.id} className="flex gap-2.5 text-[13px] leading-snug">
            <img
              src={c.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${c.authorName}`}
              alt=""
              className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5 border border-line"
            />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-ink mr-1.5">{c.authorHandle}</span>
              <span className="text-[#D8CFC1]">{c.text}</span>
            </div>
          </div>
        ))}

        {r.commentsCount > 0 && (
          <button
            type="button"
            onClick={onComentarios}
            className="text-xs text-muted hover:text-accent transition font-medium block"
          >
            {r.commentsCount > 2
              ? `Ver todos os ${r.commentsCount} comentários`
              : 'Ver comentários'}
          </button>
        )}

        <button
          type="button"
          onClick={onComentarios}
          className="flex h-10 w-full items-center rounded-full border border-line bg-bg px-4 text-left text-[13px] text-muted hover:border-muted/50 hover:text-ink transition"
        >
          Adicione um comentário...
        </button>
      </div>
    </article>
  );
}

const fmt = (n: number) => (n ?? 0).toFixed(1).replace('.', ',');

function tempo(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  if (m < 1440) return `há ${Math.floor(m / 60)} h`;
  const dias = Math.floor(m / 1440);
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} d`;
}
