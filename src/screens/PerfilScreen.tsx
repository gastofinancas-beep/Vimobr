import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Moon, Sun, Plus, LogOut, HelpCircle } from 'lucide-react';
import { carregarReviewsDoUsuario, obterListasUsuario, reviewsLocaisDoUsuario } from '../lib/reviews';
import { photoUrl, SAMPLE_PLACES } from '../lib/places';
import DiarioTab from '../components/DiarioTab';
import ResumoPaladar from '../components/ResumoPaladar';
import ConquistasTab from '../components/ConquistasTab';
import NotificationsModal from '../components/NotificationsModal';
import ProSheet from '../components/ProSheet';
import { Medalha, SeloPro, rotuloNivel } from '../components/Medalha';
import { ehPro } from '../lib/plano';
import { obterResumoConquistas } from '../lib/badges';
import { Avatar, PlaceImage, Spinner, btn, card } from '../components/ui';
import type { Place, Review, UserProfile } from '../types';

interface PerfilScreenProps {
  uid: string;
  currentUser: UserProfile;
  onAbrirLugar: (placeOrId: Place | string) => void;
  onEditarPerfil: () => void;
  onAvaliarLugar?: (p: Place) => void;
  onNovaAvaliacao?: () => void;
  onExplorar?: () => void;
  onMudarTab?: (tab: any) => void;
  tema?: 'dark' | 'light';
  onToggleTema?: () => void;
  onLogout?: () => void;
  onAbrirTutorial?: () => void;
}

type PerfilTab = 'diario' | 'paladar' | 'conquistas';

const ABAS: { key: PerfilTab; label: string; soDono?: boolean }[] = [
  { key: 'diario', label: 'Diário' },
  { key: 'paladar', label: 'Paladar' },
  { key: 'conquistas', label: 'Conquistas', soDono: true },
];

const fotoCard = (r: Review) => r.photos?.[0] || r.placePhotoUrl || photoUrl(r.placePhotoName, 300);

export default function PerfilScreen({
  uid,
  currentUser,
  onAbrirLugar,
  onEditarPerfil,
  onNovaAvaliacao,
  onExplorar,
  tema = 'dark',
  onToggleTema,
  onLogout,
  onAbrirTutorial,
}: PerfilScreenProps) {
  const isMeuPerfil = uid === currentUser.uid;

  const [aba, setAba] = useState<PerfilTab>('diario');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPro, setMostrarPro] = useState(false);
  const [listas, setListas] = useState<{ queroIr: string[]; jaFui: string[]; favoritos: string[] }>({
    queroIr: [],
    jaFui: [],
    favoritos: [],
  });

  useEffect(() => {
    let ativo = true;
    // Mostra na hora o que já está no aparelho e atualiza quando o servidor responder
    const locais = reviewsLocaisDoUsuario(uid);
    setReviews(locais);
    setListas(obterListasUsuario(uid));
    setCarregando(locais.length === 0);
    carregarReviewsDoUsuario(uid)
      .then((r) => {
        if (!ativo) return;
        setReviews(r);
        setListas(obterListasUsuario(uid));
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [uid]);

  // Perfil de outra pessoa: usa os dados das reviews dela (sem inventar nada)
  const usuario: UserProfile = useMemo(() => {
    if (isMeuPerfil) return currentUser;
    const r = reviews[0];
    return {
      uid,
      displayName: r?.authorName ?? 'Usuário',
      handle: r?.authorHandle ?? '@usuario',
      photoURL: r?.authorPhoto ?? '',
      bio: '',
      homeCityKey: r?.cityKey ?? '',
      homeCityName: r?.cityName ?? '',
      followersCount: 0,
      followingCount: 0,
    };
  }, [isMeuPerfil, currentUser, reviews, uid]);

  const idasNoAno = reviews.filter((r) => new Date(r.visitedAt).getFullYear() === new Date().getFullYear()).length;

  const favoritos = useMemo(() => {
    const lista: { placeId: string; placeName: string; photoUrl: string }[] = [];
    // 1. Favoritos da lista
    for (const id of listas.favoritos) {
      const r = reviews.find((x) => x.placeId === id);
      if (r) {
        lista.push({
          placeId: r.placeId,
          placeName: r.placeName,
          photoUrl: fotoCard(r),
        });
      } else {
        const p = SAMPLE_PLACES.find((x) => x.id === id);
        if (p) {
          lista.push({
            placeId: p.id,
            placeName: p.name,
            photoUrl: p.photoUrl || photoUrl(p.photoName, 300),
          });
        }
      }
      if (lista.length >= 4) break;
    }
    // 2. Complementa com reviews do usuário se houver menos de 4
    if (lista.length < 4) {
      for (const r of reviews) {
        if (!lista.some((l) => l.placeId === r.placeId)) {
          lista.push({
            placeId: r.placeId,
            placeName: r.placeName,
            photoUrl: fotoCard(r),
          });
        }
        if (lista.length >= 4) break;
      }
    }
    return lista;
  }, [listas.favoritos, reviews]);

  const abasVisiveis = ABAS.filter((a) => !a.soDono || isMeuPerfil);
  const pro = ehPro(usuario);
  const medalhas = useMemo(
    () => obterResumoConquistas(reviews).desbloqueadas.sort((a, b) => b.pontos - a.pontos),
    [reviews]
  );

  const numeros: { valor: number; rotulo: string }[] = [
    { valor: reviews.length, rotulo: reviews.length === 1 ? 'ida' : 'idas' },
    { valor: idasNoAno, rotulo: 'neste ano' },
    { valor: usuario.followersCount ?? 0, rotulo: 'seguidores' },
    { valor: usuario.followingCount ?? 0, rotulo: 'seguindo' },
  ];

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      <div className="max-w-xl mx-auto">
        {/* Barra superior */}
        {isMeuPerfil && (
          <header className="flex items-center justify-between px-4 pt-4 pb-3">
            <h1 className="t-title text-ink">Perfil</h1>
            <div className="flex items-center gap-1">
              {onAbrirTutorial && (
                <button type="button" onClick={onAbrirTutorial} aria-label="Como funciona o VIMO" className={btn.icon}>
                  <HelpCircle size={19} strokeWidth={1.8} />
                </button>
              )}
              {onToggleTema && (
                <button
                  type="button"
                  onClick={onToggleTema}
                  aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
                  className={btn.icon}
                >
                  {tema === 'dark' ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
                </button>
              )}
              <button type="button" onClick={() => setMostrarNotificacoes(true)} aria-label="Notificações" className={btn.icon}>
                <Bell size={19} strokeWidth={1.8} />
              </button>
              {onLogout && (
                <button type="button" onClick={onLogout} aria-label="Sair da conta" className={btn.icon}>
                  <LogOut size={19} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Identidade: foto, nome e ação principal */}
        <div className="px-4">
          <div className="flex items-center gap-4">
            <Avatar src={usuario.photoURL} name={usuario.displayName} size={76} className="text-2xl ring-4 ring-s1 shadow-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-display text-[22px] font-bold tracking-tight text-ink">{usuario.displayName}</h2>
                {pro && <SeloPro className="shrink-0" />}
              </div>
              <p className="truncate text-sm text-muted">
                {usuario.handle}
                {usuario.homeCityName ? ` · ${usuario.homeCityName}` : ''}
              </p>
            </div>
          </div>

          {/* Números reais em destaque */}
          <dl className={`mt-5 grid grid-cols-4 ${card} py-3`}>
            {numeros.map((n, k) => (
              <div key={n.rotulo} className={`flex flex-col items-center ${k > 0 ? 'border-l border-line' : ''}`}>
                <dd className="t-rating text-xl text-ink">{n.valor}</dd>
                <dt className="text-xs text-muted">{n.rotulo}</dt>
              </div>
            ))}
          </dl>

          {usuario.bio && <p className="mt-4 t-body text-ink-2">{usuario.bio}</p>}

          {isMeuPerfil && (
            <button type="button" onClick={onEditarPerfil} className={`${btn.outline} mt-4 h-10 w-full`}>
              Editar perfil
            </button>
          )}
        </div>

        {/* Medalhas: vitrine para assinantes PRO */}
        {pro ? (
          <section aria-labelledby="titulo-medalhas" className="mt-7">
            <div className="mb-3 flex items-baseline justify-between px-4">
              <h2 id="titulo-medalhas" className="t-section text-ink">
                Medalhas <span className="font-medium text-muted tabular">{medalhas.length}</span>
              </h2>
              {isMeuPerfil && (
                <button type="button" onClick={() => setAba('conquistas')} className="text-sm font-semibold text-primary cursor-pointer">
                  Ver todas
                </button>
              )}
            </div>
            {medalhas.length > 0 ? (
              <ul className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1">
                {medalhas.map((m) => (
                  <li key={m.id} className="flex w-[76px] shrink-0 flex-col items-center text-center">
                    <Medalha badge={m} tamanho={64} className="mascote-entrar" />
                    <span className="mt-2 line-clamp-2 text-xs font-semibold leading-tight text-ink">{m.titulo}</span>
                    <span className="mt-0.5 text-[11px] text-muted">{rotuloNivel(m.tier)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 text-sm text-muted">
                {isMeuPerfil ? 'Registre idas para ganhar as primeiras medalhas.' : 'Nenhuma medalha ainda.'}
              </p>
            )}
          </section>
        ) : (
          isMeuPerfil && (
            <section className="mt-6 px-4">
              <button
                type="button"
                onClick={() => setMostrarPro(true)}
                className={`${card} flex w-full items-center gap-4 p-4 text-left transition-transform active:scale-[0.99] cursor-pointer`}
              >
                <span className="flex -space-x-3" aria-hidden="true">
                  {(['ouro', 'prata', 'bronze'] as const).map((t, i) => (
                    <Medalha
                      key={t}
                      badge={{ icone: ['trophy', 'flag', 'coffee'][i], tier: t, desbloqueada: true, titulo: '' }}
                      tamanho={40}
                      className="ring-2 ring-s1"
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">Medalhas no perfil</span>
                  <span className="block text-sm text-muted">
                    {medalhas.length > 0
                      ? `Você já tem ${medalhas.length} ${medalhas.length === 1 ? 'medalha' : 'medalhas'}. Mostre com o PRO.`
                      : 'Disponível no VIMO PRO.'}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">PRO</span>
              </button>
            </section>
          )
        )}

        {/* 4 favoritos */}
        <section aria-labelledby="titulo-favoritos" className="mt-7 px-4">
          <h2 id="titulo-favoritos" className="t-section text-ink mb-3">Favoritos</h2>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => {
              const fav = favoritos[i];
              if (fav) {
                return (
                  <button
                    key={fav.placeId}
                    type="button"
                    onClick={() => onAbrirLugar(fav.placeId)}
                    aria-label={fav.placeName}
                    className="relative aspect-[3/4] overflow-hidden rounded-md cursor-pointer"
                  >
                    <PlaceImage src={fav.photoUrl} name={fav.placeName} showName className="absolute inset-0 h-full w-full" />
                  </button>
                );
              }
              return isMeuPerfil ? (
                <button
                  key={i}
                  type="button"
                  onClick={onExplorar || onNovaAvaliacao}
                  aria-label="Adicionar lugar favorito"
                  className="flex aspect-[3/4] items-center justify-center rounded-md bg-s1 text-muted ring-1 ring-inset ring-line hover:text-primary hover:ring-primary transition cursor-pointer"
                >
                  <Plus size={18} strokeWidth={1.8} />
                </button>
              ) : (
                <div key={i} className="aspect-[3/4] rounded-md bg-s1" />
              );
            })}
          </div>
        </section>

        {/* Abas */}
        <div role="tablist" aria-label="Seções do perfil" className="mx-4 mt-7 flex gap-6 border-b border-line">
          {abasVisiveis.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={aba === a.key}
              onClick={() => setAba(a.key)}
              className={`-mb-px border-b-2 pb-2.5 text-[15px] transition-colors cursor-pointer ${
                aba === a.key ? 'border-primary font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <main className="px-4 pt-4">
          {carregando ? (
            <Spinner label="Carregando perfil" />
          ) : (
            <>
              {aba === 'diario' && (
                <DiarioTab
                  reviews={reviews}
                  onAbrirLugar={onAbrirLugar}
                  onNovaIda={onNovaAvaliacao}
                  somenteLeitura={!isMeuPerfil}
                />
              )}
              {aba === 'paladar' && (
                <ResumoPaladar reviews={reviews} userName={usuario.displayName} isMeuPerfil={isMeuPerfil} />
              )}
              {aba === 'conquistas' && <ConquistasTab reviews={reviews} />}
            </>
          )}
        </main>
      </div>

      {mostrarPro && <ProSheet uid={currentUser.uid} onClose={() => setMostrarPro(false)} />}

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(p) => {
            setMostrarNotificacoes(false);
            onAbrirLugar(p);
          }}
          onAbrirPerfil={() => setMostrarNotificacoes(false)}
        />
      )}
    </div>
  );
}
