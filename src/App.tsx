import { useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './lib/firebase';
import { initGoogleMaps } from './lib/googleMaps';
import { registrarServiceWorker, iniciarEscutaNotificacoes } from './lib/fcm';
import { cachePlace } from './lib/places';
import type { Place, UserProfile } from './types';
import Navigation, { type TabKey } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import LoginScreen from './screens/LoginScreen';
import ExplorarScreen from './screens/ExplorarScreen';
import DescobrirPertoDeMimScreen from './screens/DescobrirPertoDeMimScreen';
import AmigosScreen from './screens/AmigosScreen';
import PerfilScreen from './screens/PerfilScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import AvaliarModal from './screens/AvaliarModal';
import OnboardingModal from './components/OnboardingModal';
import SearchModal from './components/SearchModal';

const DEFAULT_CURRENT_USER: UserProfile = {
  uid: 'user-me',
  displayName: 'Pedro Otávio',
  handle: '@pedrootavio',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  bio: 'Explorador da gastronomia paulistana e caçador dos melhores cafés e pães artesanais.',
  homeCityKey: 'sao-paulo-sp',
  homeCityName: 'São Paulo - SP',
  followersCount: 0,
  followingCount: 0,
};

export default function App() {
  const [tabAtiva, setTabAtiva] = useState<TabKey>('explorar');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceeded(true);
    };

    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);

    // Pré-carrega o Google Maps JS API com suporte a Maps e Places
    initGoogleMaps().catch((err) => {
      console.warn('Google Maps Loader info:', err?.message || err);
    });

    // Registra Service Worker e inicia escuta de notificações push (FCM)
    registrarServiceWorker();
    iniciarEscutaNotificacoes();

    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const [tema, setTema] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('vimo_theme_mode_v2');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (tema === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('vimo_theme_mode_v2', tema);
  }, [tema]);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('vimo_current_user');
      return saved ? JSON.parse(saved) : DEFAULT_CURRENT_USER;
    } catch {
      return DEFAULT_CURRENT_USER;
    }
  });

  const [isAutenticado, setIsAutenticado] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vimo_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [lugarDetalheId, setLugarDetalheId] = useState<string | null>(null);
  const [lugarDetalheObjeto, setLugarDetalheObjeto] = useState<Place | null>(null);
  const [perfilVisualizadoUid, setPerfilVisualizadoUid] = useState<string | null>(null);
  const [mostrarModalAvaliar, setMostrarModalAvaliar] = useState(false);
  const [lugarParaAvaliar, setLugarParaAvaliar] = useState<Place | null>(null);
  const [mostrarBusca, setMostrarBusca] = useState(false);

  // Monitorar Firebase Auth se configurado
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser) {
        setIsAutenticado(true);
        localStorage.setItem('vimo_authenticated', 'true');
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem('vimo_current_user', JSON.stringify(data));
          } else {
            // Primeiro acesso: abrir onboarding
            setMostrarOnboarding(true);
          }
        } catch (err) {
          console.warn('Erro ao carregar dados do usuário:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAutenticado(true);
    localStorage.setItem('vimo_current_user', JSON.stringify(user));
    localStorage.setItem('vimo_authenticated', 'true');
  };

  const handleLogout = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Erro ao deslogar:', e);
    }
    setIsAutenticado(false);
    localStorage.removeItem('vimo_authenticated');
  };

  const handleExploreAsGuest = () => {
    setIsAutenticado(true);
    localStorage.setItem('vimo_authenticated', 'true');
  };

  const handleSalvarPerfil = async (perfil: UserProfile) => {
    setCurrentUser(perfil);
    localStorage.setItem('vimo_current_user', JSON.stringify(perfil));
    setMostrarOnboarding(false);

    if (isFirebaseConfigured && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), perfil, { merge: true });
      } catch (err) {
        console.warn('Erro ao salvar perfil no Firestore:', err);
      }
    }
  };

  const handleLoginGoogle = async () => {
    if (!isFirebaseConfigured) {
      setMostrarOnboarding(true);
      return;
    }
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setMostrarOnboarding(true);
      }
    } catch (err) {
      console.warn('Login Google falhou, abrindo onboarding:', err);
      setMostrarOnboarding(true);
    }
  };

  const handleAbrirLugar = (placeOrId: Place | string) => {
    if (typeof placeOrId === 'string') {
      setLugarDetalheId(placeOrId);
      setLugarDetalheObjeto(null);
    } else {
      setLugarDetalheId(placeOrId.id);
      setLugarDetalheObjeto(placeOrId);
      cachePlace(placeOrId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAbrirPerfil = (uid: string) => {
    setLugarDetalheId(null);
    setLugarDetalheObjeto(null);
    if (uid === currentUser.uid) {
      setPerfilVisualizadoUid(null);
      setTabAtiva('perfil');
    } else {
      setPerfilVisualizadoUid(uid);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAbrirAvaliarComLugar = (place: Place) => {
    setLugarParaAvaliar(place);
    setMostrarModalAvaliar(true);
  };

  if (!isAutenticado) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onExploreAsGuest={handleExploreAsGuest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col antialiased font-sans">
      <OfflineIndicator />

      {/* Roteamento e Telas Principais */}
      <main className="flex-1 flex flex-col">
        {lugarDetalheId ? (
          <PlaceDetailScreen
            placeId={lugarDetalheId}
            initialPlace={lugarDetalheObjeto}
            currentUser={currentUser}
            onVoltar={() => {
              setLugarDetalheId(null);
              setLugarDetalheObjeto(null);
            }}
            onAvaliar={handleAbrirAvaliarComLugar}
            onAbrirPerfil={handleAbrirPerfil}
          />
        ) : perfilVisualizadoUid && perfilVisualizadoUid !== currentUser.uid ? (
          <div>
            {/* Header com botão voltar ao ver perfil de terceiros */}
            <div className="sticky top-0 z-30 p-3 bg-bg/95 backdrop-blur border-b border-line flex items-center justify-between">
              <button
                onClick={() => setPerfilVisualizadoUid(null)}
                className="text-xs font-bold text-accent px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 cursor-pointer"
              >
                ← Voltar
              </button>
              <span className="font-display text-sm font-semibold">Perfil</span>
              <div className="w-16" />
            </div>
            <PerfilScreen
              uid={perfilVisualizadoUid}
              currentUser={currentUser}
              onAbrirLugar={handleAbrirLugar}
              onEditarPerfil={() => setMostrarOnboarding(true)}
              onAvaliarLugar={handleAbrirAvaliarComLugar}
              onNovaAvaliacao={() => {
                setLugarParaAvaliar(null);
                setMostrarModalAvaliar(true);
              }}
              onExplorar={() => {
                setPerfilVisualizadoUid(null);
                setTabAtiva('explorar');
              }}
              tema={tema}
              onToggleTema={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
              onLogout={handleLogout}
            />
          </div>
        ) : (
          <div key={tabAtiva} className="animate-tab-content w-full min-h-screen">
            {tabAtiva === 'explorar' && (
              <ExplorarScreen
                currentUser={currentUser}
                onAbrirLugar={handleAbrirLugar}
                onAbrirPerfil={handleAbrirPerfil}
                onAbrirBusca={() => setMostrarBusca(true)}
                onAbrirAvaliar={() => {
                  setLugarParaAvaliar(null);
                  setMostrarModalAvaliar(true);
                }}
                onMudarTab={(t) => setTabAtiva(t)}
                tema={tema}
                onToggleTema={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
              />
            )}

            {tabAtiva === 'mapa' && (
              <DescobrirPertoDeMimScreen
                onAbrirLugar={handleAbrirLugar}
                currentUser={currentUser}
                onAvaliar={handleAbrirAvaliarComLugar}
              />
            )}

            {tabAtiva === 'amigos' && (
              <AmigosScreen
                currentUser={currentUser}
                onAbrirLugar={handleAbrirLugar}
                onAbrirPerfil={handleAbrirPerfil}
                onAbrirBusca={() => setMostrarBusca(true)}
                onAbrirAvaliar={() => {
                  setLugarParaAvaliar(null);
                  setMostrarModalAvaliar(true);
                }}
              />
            )}

            {tabAtiva === 'perfil' && (
              <PerfilScreen
                uid={currentUser.uid}
                currentUser={currentUser}
                onAbrirLugar={handleAbrirLugar}
                onEditarPerfil={() => setMostrarOnboarding(true)}
                onAvaliarLugar={handleAbrirAvaliarComLugar}
                onNovaAvaliacao={() => {
                  setLugarParaAvaliar(null);
                  setMostrarModalAvaliar(true);
                }}
                onExplorar={() => setTabAtiva('explorar')}
                onMudarTab={(tab) => setTabAtiva(tab)}
                tema={tema}
                onToggleTema={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
                onLogout={handleLogout}
              />
            )}
          </div>
        )}
      </main>

      {/* Barra Inferior Flutuante (pílula 66px arredondada) */}
      <Navigation
        tabAtiva={tabAtiva}
        onMudarTab={(novaTab) => {
          setLugarDetalheId(null);
          setPerfilVisualizadoUid(null);
          setTabAtiva(novaTab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onAbrirAvaliar={() => {
          setLugarParaAvaliar(null);
          setMostrarModalAvaliar(true);
        }}
      />

      {/* Modal de Avaliação (+) */}
      {mostrarModalAvaliar && (
        <AvaliarModal
          lugarInicial={lugarParaAvaliar}
          currentUser={currentUser}
          onClose={() => setMostrarModalAvaliar(false)}
          onSucesso={(revId) => {
            setMostrarModalAvaliar(false);
            setLugarDetalheId(null);
            setTabAtiva('explorar');
          }}
        />
      )}

      {/* Modal de Busca Rápida */}
      {mostrarBusca && (
        <SearchModal
          onClose={() => setMostrarBusca(false)}
          onAbrirLugar={handleAbrirLugar}
          onAbrirPerfil={handleAbrirPerfil}
        />
      )}

      {/* Modal de Onboarding / Edição de Perfil */}
      {mostrarOnboarding && (
        <OnboardingModal
          initialUser={currentUser}
          onSalvar={handleSalvarPerfil}
        />
      )}
    </div>
  );
}
