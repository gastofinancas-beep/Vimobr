import { useEffect, useRef, useState } from 'react';
import { PenSquare } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import CriarPostModal from '../components/CriarPostModal';
import { FeedPosts, SkeletonPosts } from '../components/PostCard';
import { carregarPosts } from '../lib/posts';
import type { FoodTweet, UserProfile } from '../types';
import MascotMessage from '../components/MascotMessage';
import { Logo, btn } from '../components/ui';

type AbaFeed = 'explorar' | 'seguindo';

const ABAS: { key: AbaFeed; label: string }[] = [
  { key: 'explorar', label: 'Explorar' },
  { key: 'seguindo', label: 'Seguindo' },
];

// Mantém a aba ao voltar de um lugar ou perfil
const SS_ABA = 'vimo_explorar_aba';

function lerSessao(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarSessao(chave: string, valor: string | null) {
  try {
    if (valor === null) sessionStorage.removeItem(chave);
    else sessionStorage.setItem(chave, valor);
  } catch {}
}

interface ExplorarScreenProps {
  currentUser: UserProfile;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca?: () => void;
  onAbrirAvaliar?: () => void;
  onMudarTab?: (tab: 'explorar' | 'descobrir' | 'comunidade' | 'perfil') => void;
  tema?: 'dark' | 'light';
  onToggleTema?: () => void;
}

export default function ExplorarScreen({ currentUser, onAbrirLugar, onAbrirPerfil }: ExplorarScreenProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaFeed>(() => {
    const salva = lerSessao(SS_ABA);
    return salva === 'seguindo' ? salva : 'explorar';
  });
  const [posts, setPosts] = useState<FoodTweet[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarCriarPost, setMostrarCriarPost] = useState(false);
  const carregouRef = useRef<AbaFeed | null>(null);

  const carregar = (aba: AbaFeed) => {
    setCarregando(true);
    carregarPosts(currentUser.uid, 30)
      .then((lista) => setPosts(aba === 'seguindo' ? lista.filter((p) => p.isMutual) : lista))
      .catch(() => setPosts([]))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    gravarSessao(SS_ABA, abaAtiva);
    if (carregouRef.current === abaAtiva) return;
    carregouRef.current = abaAtiva;
    carregar(abaAtiva);
  }, [abaAtiva, currentUser.uid]);

  const handleNovoPost = () => {
    setMostrarCriarPost(false);
    carregouRef.current = null;
    carregar(abaAtiva);
  };

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 pt-4 pb-3">
          <Logo altura={24} />
          <NotificationBell
            currentUserUid={currentUser.uid}
            onClick={() => setMostrarNotificacoes(true)}
            className={btn.icon}
          />
        </div>

        <div className="max-w-2xl mx-auto flex border-b border-line">
          {ABAS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === abaAtiva) return;
                carregouRef.current = null;
                setPosts([]);
                setAbaAtiva(key);
              }}
              className={`flex-1 py-2.5 text-[14px] font-semibold transition-colors cursor-pointer ${
                abaAtiva === key ? 'text-ink border-b-2 border-ink -mb-px' : 'text-muted hover:text-ink-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {carregando ? (
          <SkeletonPosts />
        ) : posts.length === 0 ? (
          <MascotMessage
            reaction="pensativo"
            title={abaAtiva === 'seguindo' ? 'Nenhuma publicação de quem você segue' : 'Nenhuma publicação por aqui ainda'}
            subtitle={abaAtiva === 'seguindo' ? 'Siga pessoas para ver as publicações delas aqui.' : 'Seja o primeiro a publicar algo.'}
          />
        ) : (
          <FeedPosts
            posts={posts}
            setPosts={setPosts}
            currentUser={currentUser}
            onAbrirLugar={onAbrirLugar}
            onAbrirPerfil={onAbrirPerfil}
          />
        )}
      </main>

      <button
        type="button"
        onClick={() => setMostrarCriarPost(true)}
        aria-label="Nova publicação"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        <PenSquare size={22} strokeWidth={2} className="text-white" />
      </button>

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(id) => onAbrirLugar(id)}
          onAbrirPerfil={onAbrirPerfil}
        />
      )}

      {mostrarCriarPost && (
        <CriarPostModal
          currentUser={currentUser}
          onClose={() => setMostrarCriarPost(false)}
          onPublicado={handleNovoPost}
        />
      )}
    </div>
  );
}
