import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Moon, Sun, Plus, LogOut } from 'lucide-react';
import { carregarReviewsDoUsuario, obterListasUsuario, reviewsLocaisDoUsuario } from '../lib/reviews';
import { photoUrl, SAMPLE_PLACES } from '../lib/places';
import DiarioTab from '../components/DiarioTab';
import ResumoPaladar from '../components/ResumoPaladar';
import ConquistasTab from '../components/ConquistasTab';
import NotificationsModal from '../components/NotificationsModal';
import { Avatar, PlaceImage, Spinner, btn, corDoLugar } from '../components/ui';
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
}: PerfilScreenProps) {
  const isMeuPerfil = uid === currentUser.uid;

  const [aba, setAba] = useState<PerfilTab>('diario');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
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
  const capa = reviews[0] ? fotoCard(reviews[0]) : null;

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

        {/* Capa (foto da ida mais recente) com a foto do perfil sobreposta */}
        <div className="px-4">
          <div className="relative h-28 overflow-hidden rounded-lg" style={{ backgroundColor: corDoLugar(usuario.displayName) }}>
            {capa && <PlaceImage src={capa} name="" className="h-full w-full opacity-70" />}
          </div>
          <div className="relative z-10 -mt-10 px-1">
            <Avatar
              src={usuario.photoURL}
              name={usuario.displayName}
              size={80}
              className="ring-4 ring-bg text-2xl"
            />
          </div>

          <div className="mt-3 px-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-ink">{usuario.displayName}</h2>
                <p className="t-meta mt-0.5">
                  {usuario.handle}
                  {usuario.homeCityName ? ` · ${usuario.homeCityName}` : ''}
                </p>
              </div>
              {isMeuPerfil && (
                <button type="button" onClick={onEditarPerfil} className={`${btn.secondary} h-8 shrink-0 px-3.5 text-sm`}>
                  Editar perfil
                </button>
              )}
            </div>
            {usuario.bio && <p className="mt-3 t-body text-ink-2">{usuario.bio}</p>}

            {/* Números reais em uma linha */}
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
              {numeros.map((n) => (
                <div key={n.rotulo} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{n.rotulo}</dt>
                  <dd className="t-rating text-base text-ink">{n.valor}</dd>
                  <span className="text-sm text-muted">{n.rotulo}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>

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
        <div role="tablist" aria-label="Seções do perfil" className="mt-7 flex gap-6 border-b border-line px-4">
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
