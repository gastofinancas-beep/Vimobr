import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Edit3, Moon, Sun, MapPin, Plus, LogOut } from 'lucide-react';
import { carregarReviewsDoUsuario, obterListasUsuario } from '../lib/reviews';
import { photoUrl, SAMPLE_PLACES } from '../lib/places';
import DiarioTab from '../components/DiarioTab';
import ResumoPaladar from '../components/ResumoPaladar';
import ConquistasTab from '../components/ConquistasTab';
import NotificationsModal from '../components/NotificationsModal';
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
    setCarregando(true);
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

  return (
    <div className="flex-1 w-full bg-[var(--bg)] text-[var(--ink)] min-h-screen pb-24">
      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-medium text-[var(--ink)]">
              {isMeuPerfil ? 'Meu Perfil' : 'Perfil'}
            </h1>
            <p className="text-[12px] text-[var(--muted)]">
              {usuario.handle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onToggleTema && (
              <button
                type="button"
                onClick={onToggleTema}
                aria-label="Alternar tema claro ou escuro"
                className="w-11 h-11 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-[var(--ink)] hover:text-[var(--primary)] flex items-center justify-center cursor-pointer transition"
              >
                {tema === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}
            {isMeuPerfil && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair da conta"
                title="Sair ou trocar de conta"
                className="w-11 h-11 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-[var(--muted)] hover:text-red-500 flex items-center justify-center cursor-pointer transition"
              >
                <LogOut size={18} />
              </button>
            )}
            {isMeuPerfil && (
              <button
                type="button"
                onClick={() => setMostrarNotificacoes(true)}
                aria-label="Notificações"
                className="w-11 h-11 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-[var(--ink)] hover:text-[var(--primary)] flex items-center justify-center cursor-pointer transition"
              >
                <Bell size={18} />
              </button>
            )}
          </div>
        </header>

        {/* User Card Info */}
        <div className="bg-[var(--s1)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--primary)] bg-[var(--s2)] shrink-0 flex items-center justify-center text-xl font-bold text-[var(--primary)]">
                {usuario.photoURL ? (
                  <img src={usuario.photoURL} alt={usuario.displayName} className="w-full h-full object-cover" />
                ) : (
                  usuario.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold text-[var(--ink)] truncate">
                  {usuario.displayName}
                </h2>
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] mt-0.5">
                  <span className="font-medium">{usuario.handle}</span>
                  {usuario.homeCityName && (
                    <>
                      <span>·</span>
                      <MapPin size={12} className="shrink-0 text-[var(--star)]" />
                      <span className="truncate">{usuario.homeCityName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isMeuPerfil && (
              <button
                type="button"
                onClick={onEditarPerfil}
                aria-label="Editar perfil"
                className="min-h-11 px-3.5 rounded-xl border border-[var(--line)] text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer transition shrink-0"
              >
                <Edit3 size={14} /> Editar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[12px] text-[var(--muted)] pt-0.5">
            <span><strong className="text-[var(--ink)]">{usuario.followersCount ?? 0}</strong> seguidores</span>
            <span>·</span>
            <span><strong className="text-[var(--ink)]">{usuario.followingCount ?? 0}</strong> seguindo</span>
          </div>

          {usuario.bio && (
            <p className="text-[13px] text-[var(--ink)] leading-relaxed pt-2 border-t border-[var(--line)]">
              {usuario.bio}
            </p>
          )}
        </div>

        <main className="space-y-4">
          {/* Números reais */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--s1)] border border-[var(--line)] rounded-xl py-3 text-center">
              <div className="text-[20px] font-bold text-[var(--primary)]">{reviews.length}</div>
              <div className="text-[12px] text-[var(--muted)]">Idas</div>
            </div>
            <div className="bg-[var(--s1)] border border-[var(--line)] rounded-xl py-3 text-center">
              <div className="text-[20px] font-bold text-[var(--primary)]">{idasNoAno}</div>
              <div className="text-[12px] text-[var(--muted)]">Neste ano</div>
            </div>
            <div className="bg-[var(--s1)] border border-[var(--line)] rounded-xl py-3 text-center">
              <div className="text-[20px] font-bold text-[var(--primary)]">{listas.queroIr.length}</div>
              <div className="text-[12px] text-[var(--muted)]">Quero ir</div>
            </div>
          </div>

          {/* 4 favoritos */}
          <section aria-label="Lugares favoritos">
            <h2 className="text-[12px] font-medium tracking-wider text-[var(--muted)] mb-2 uppercase">
              Lugares Favoritos
            </h2>
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
                      className="aspect-[3/4] rounded-xl bg-[var(--s2)] border border-[var(--line)] overflow-hidden cursor-pointer hover:border-[var(--primary)] transition"
                    >
                      {fav.photoUrl ? (
                        <img src={fav.photoUrl} alt={fav.placeName} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[12px] text-[var(--muted)] p-1 text-center font-medium">
                          {fav.placeName}
                        </div>
                      )}
                    </button>
                  );
                }
                return isMeuPerfil ? (
                  <button
                    key={i}
                    type="button"
                    onClick={onExplorar || onNovaAvaliacao}
                    aria-label="Adicionar lugar favorito"
                    className="aspect-[3/4] rounded-xl border border-dashed border-[var(--line)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-center cursor-pointer transition"
                  >
                    <Plus size={20} />
                  </button>
                ) : (
                  <div key={i} className="aspect-[3/4] rounded-xl border border-dashed border-[var(--line)]" />
                );
              })}
            </div>
          </section>

          {/* Abas */}
          <div
            role="tablist"
            aria-label="Seções do perfil"
            className="flex border-b border-[var(--line)]"
          >
            {abasVisiveis.map((a) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={aba === a.key}
                onClick={() => setAba(a.key)}
                className={`flex-1 min-h-11 pb-2 text-[14px] text-center transition cursor-pointer ${
                  aba === a.key
                    ? 'text-[var(--ink)] font-medium border-b-2 border-[var(--primary)] -mb-px'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] font-normal'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          {carregando ? (
            <p className="text-[13px] text-[var(--muted)] py-8 text-center">Carregando…</p>
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
