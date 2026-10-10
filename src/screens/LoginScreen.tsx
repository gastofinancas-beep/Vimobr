import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { MascoteHero } from '../components/Mascote';
import { Logo, btn } from '../components/ui';
import type { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onExploreAsGuest?: () => void;
}

const ICONE = 'pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted';
const CAMPO =
  'h-[52px] w-full rounded-xl bg-s1 pl-11 pr-4 text-base text-ink outline-none ring-1 ring-inset ring-line transition placeholder:text-muted focus:ring-2 focus:ring-primary';
const CAMPO_SENHA = CAMPO.replace('pr-4', 'pr-12');
const SOCIAL =
  'flex h-12 items-center justify-center gap-2 rounded-full bg-s1 px-3 text-sm font-semibold text-ink ring-1 ring-inset ring-line transition hover:bg-s2 active:scale-[0.98] disabled:opacity-60 cursor-pointer';

export default function LoginScreen({ onLoginSuccess, onExploreAsGuest }: LoginScreenProps) {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [senhaFocada, setSenhaFocada] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha.trim()) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    if (modo === 'cadastrar' && !nome.trim()) {
      setErro('Por favor, informe seu nome.');
      return;
    }

    setCarregando(true);

    try {
      if (isFirebaseConfigured) {
        if (modo === 'cadastrar') {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
          const fbUser = cred.user;
          const novoPerfil: UserProfile = {
            uid: fbUser.uid,
            displayName: nome.trim(),
            handle: `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
            photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nome)}&backgroundColor=111827`,
            bio: 'Explorando bons restaurantes e boas companhias no VIMO.',
            homeCityKey: 'sao-paulo-sp',
            homeCityName: 'São Paulo - SP',
            followersCount: 0,
            followingCount: 0,
          };
          await setDoc(doc(db, 'users', fbUser.uid), novoPerfil, { merge: true });
          setTimeout(() => onLoginSuccess(novoPerfil), 250);
          return;
        } else {
          const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
          const fbUser = cred.user;
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          let perfil: UserProfile;
          if (userDoc.exists()) {
            perfil = userDoc.data() as UserProfile;
          } else {
            perfil = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || email.split('@')[0],
              handle: `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
              photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}&backgroundColor=111827`,
              bio: 'Explorando bons restaurantes e boas companhias no VIMO.',
              homeCityKey: 'sao-paulo-sp',
              homeCityName: 'São Paulo - SP',
              followersCount: 0,
              followingCount: 0,
            };
            await setDoc(doc(db, 'users', fbUser.uid), perfil, { merge: true });
          }
          setTimeout(() => onLoginSuccess(perfil), 250);
          return;
        }
      } else {
        const perfilLocal: UserProfile = {
          uid: 'user-' + Date.now(),
          displayName: modo === 'cadastrar' && nome.trim() ? nome.trim() : email.split('@')[0],
          handle: `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          bio: 'Explorando bons restaurantes e boas companhias no VIMO.',
          homeCityKey: 'sao-paulo-sp',
          homeCityName: 'São Paulo - SP',
          followersCount: 0,
          followingCount: 0,
        };
        setTimeout(() => onLoginSuccess(perfilLocal), 250);
      }
    } catch (err: any) {
      console.warn('Autenticação:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErro('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado. Faça login.');
      } else if (err.code === 'auth/weak-password') {
        setErro('A senha deve ter pelo menos 6 caracteres.');
      } else {
        const perfilFallback: UserProfile = {
          uid: 'user-demo',
          displayName: email.split('@')[0] || 'Gourmet',
          handle: `@${email.split('@')[0] || 'gourmet'}`,
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          bio: 'Explorador da gastronomia.',
          homeCityKey: 'sao-paulo-sp',
          homeCityName: 'São Paulo - SP',
          followersCount: 0,
          followingCount: 0,
        };
        setTimeout(() => onLoginSuccess(perfilFallback), 250);
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogleLogin = async () => {
    setCarregando(true);
    setErro(null);
    try {
      if (isFirebaseConfigured) {
        const res = await signInWithPopup(auth, googleProvider);
        const fbUser: User = res.user;
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        let perfil: UserProfile;
        if (userDoc.exists()) {
          perfil = userDoc.data() as UserProfile;
        } else {
          perfil = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Usuário Google',
            handle: `@${(fbUser.email || 'usuario').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
            photoURL: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            bio: 'Explorando sabores incríveis com boa companhia.',
            homeCityKey: 'sao-paulo-sp',
            homeCityName: 'São Paulo - SP',
            followersCount: 0,
            followingCount: 0,
          };
          await setDoc(doc(db, 'users', fbUser.uid), perfil, { merge: true });
        }
        setTimeout(() => onLoginSuccess(perfil), 250);
      } else {
        const perfilGoogle: UserProfile = {
          uid: 'user-google-demo',
          displayName: 'Pedro Otávio',
          handle: '@pedrootavio',
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          bio: 'Explorador da gastronomia paulistana.',
          homeCityKey: 'sao-paulo-sp',
          homeCityName: 'São Paulo - SP',
          followersCount: 0,
          followingCount: 0,
        };
        setTimeout(() => onLoginSuccess(perfilGoogle), 250);
      }
    } catch (err: any) {
      console.warn('Login Google:', err);
      setErro('Não foi possível entrar com Google no momento.');
    } finally {
      setCarregando(false);
    }
  };

  const handleAppleLogin = () => {
    setCarregando(true);
    setTimeout(() => {
      const perfilApple: UserProfile = {
        uid: 'user-apple-demo',
        displayName: 'Pedro Otávio',
        handle: '@pedrootavio',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        bio: 'Explorador da gastronomia.',
        homeCityKey: 'sao-paulo-sp',
        homeCityName: 'São Paulo - SP',
        followersCount: 0,
        followingCount: 0,
      };
      setTimeout(() => onLoginSuccess(perfilApple), 250);
      setCarregando(false);
    }, 300);
  };

  const cobrindo = senhaFocada && !mostrarSenha;

  return (
    <div className="min-h-[100dvh] w-full bg-bg text-ink flex justify-center">
      <div className="flex w-full max-w-[420px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        {/* Marca */}
        <div className="flex justify-center">
          <Logo altura={30} />
        </div>

        {/* Mascote: pisca e fecha os olhos enquanto a senha é digitada */}
        <div className="mt-4 flex flex-col items-center text-center">
          <MascoteHero tamanho={168} olhosFechados={cobrindo} />
          <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.025em] text-ink">
            {modo === 'entrar' ? 'Boas comidas aproximam boas pessoas.' : 'Crie sua conta no VIMO'}
          </h1>
          <p className="mt-2 max-w-[300px] text-[15px] text-muted">
            Registre e descubra experiências gastronômicas com amigos.
          </p>
        </div>

        <div className="mt-6">
          {erro && (
            <div role="alert" className="mb-3 rounded-xl bg-danger/10 px-3 py-2.5 text-center text-sm font-medium text-danger">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2.5">
            {modo === 'cadastrar' && (
              <div className="relative">
                <UserIcon strokeWidth={1.8} className={ICONE} aria-hidden="true" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  aria-label="Seu nome"
                  className={CAMPO}
                />
              </div>
            )}

            <div className="relative">
              <Mail strokeWidth={1.8} className={ICONE} aria-hidden="true" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                aria-label="Seu e-mail"
                className={CAMPO}
              />
            </div>

            <div className="relative">
              <Lock strokeWidth={1.8} className={ICONE} aria-hidden="true" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onFocus={() => setSenhaFocada(true)}
                onBlur={() => setSenhaFocada(false)}
                placeholder="Sua senha"
                aria-label="Sua senha"
                className={CAMPO_SENHA}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
              >
                {mostrarSenha ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
              </button>
            </div>

            <button type="submit" disabled={carregando} className={`${btn.primary} relative mt-1.5 w-full`}>
              {carregando ? 'Entrando…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
              {!carregando && <ArrowRight size={18} strokeWidth={2.2} className="absolute right-5" aria-hidden="true" />}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />
            <span>ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={handleGoogleLogin} disabled={carregando} className={SOCIAL}>
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                </svg>
              Google
            </button>
            <button type="button" onClick={handleAppleLogin} disabled={carregando} className={SOCIAL}>
              <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 170 170" aria-hidden="true">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.02-14.42-6.53-9.92-11.75-21.2-15.66-33.84-3.91-12.64-5.87-24.64-5.87-36 0-14.54 3.75-26.85 11.25-36.93 7.5-10.08 17.06-15.22 28.68-15.42 5.02 0 10.42 1.34 16.21 4.02 5.79 2.68 9.54 4.07 11.25 4.17 1.57 0 5.48-1.42 11.74-4.25 6.26-2.83 11.66-4.13 16.21-3.9 12.05.67 21.84 5.39 29.37 14.15-10.49 6.37-15.64 15.2-15.44 26.51.2 8.71 3.52 16.03 9.97 21.97 6.45 5.94 14.12 9.29 23 10.05-2.12 6.53-4.8 13.12-8.03 19.78zm-30.85-115.53c0 7.15-2.6 13.91-7.81 20.28-5.21 6.37-11.63 10.35-19.26 11.95-.33-1.63-.5-3.13-.5-4.5 0-7.05 2.82-14.07 8.46-21.05 5.64-6.98 12.01-10.88 19.11-11.68z" />
                </svg>
              Apple
            </button>
          </div>

          <div className="mt-5 text-center text-sm text-muted">
            {modo === 'entrar' ? (
              <p>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setModo('cadastrar');
                    setErro(null);
                  }}
                  className="font-semibold text-primary cursor-pointer"
                >
                  Criar conta
                </button>
              </p>
            ) : (
              <p>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setModo('entrar');
                    setErro(null);
                  }}
                  className="font-semibold text-primary cursor-pointer"
                >
                  Entrar
                </button>
              </p>
            )}

            {onExploreAsGuest && (
              <button
                type="button"
                onClick={onExploreAsGuest}
                className="mt-2 inline-flex min-h-10 items-center justify-center font-medium text-ink-2 underline underline-offset-4 decoration-line transition hover:text-ink cursor-pointer"
              >
                Entrar como convidado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
