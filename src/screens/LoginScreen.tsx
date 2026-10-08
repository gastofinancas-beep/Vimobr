import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import VimoMascot from '../components/VimoMascot';
import type { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onExploreAsGuest?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onExploreAsGuest }: LoginScreenProps) {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
              followersCount: 12,
              followingCount: 8,
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
          followersCount: 38,
          followingCount: 29,
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
          followersCount: 15,
          followingCount: 12,
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
            followersCount: 24,
            followingCount: 18,
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
          followersCount: 54,
          followingCount: 42,
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
        followersCount: 40,
        followingCount: 22,
      };
      setTimeout(() => onLoginSuccess(perfilApple), 250);
      setCarregando(false);
    }, 300);
  };

  return (
    <div className="h-[100dvh] w-full bg-[#111119] flex justify-center items-center font-sans antialiased text-[#F7F3EE] overflow-hidden relative selection:bg-[var(--primary)]/30 selection:text-white">
      {/* Faixa superior sutil mais escura para dar profundidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#17131A] via-[#111119] to-[#111119] pointer-events-none" />

      {/* Layout mobile centralizado */}
      <div className="w-full max-w-[400px] h-[100dvh] flex flex-col justify-between relative overflow-hidden overflow-y-auto z-10">
        
        {/* LOGO E SLOGAN (topo, 32 px padding, à esquerda, z-20) */}
        <div className="relative w-full pt-8 px-8 z-20">
          <div className="max-w-[260px]">
            {/* Wordmark VIMO. */}
            <h1 className="text-[36px] font-[900] tracking-[-0.04em] text-[#F7F3EE] leading-none select-none">
              VIMO<span className="text-[var(--star)]">.</span>
            </h1>

            {/* Slogan 3 linhas a 8 px do logo */}
            <p className="text-[16px] font-normal text-[#C7CAD9] leading-[1.3] mt-2">
              Mais do que<br />
              restaurantes,<br />
              boas companhias.
            </p>

            {/* Barra laranja 40×3 px a 8 px do slogan */}
            <div className="w-10 h-[3px] bg-[var(--star)] rounded-full mt-2" />
          </div>
        </div>

        {/* MASCOTE + CARD: envelope grudado no fim da tela */}
        <div className="relative w-full mt-auto shrink-0">
          
          {/* MASCOTE posicionado absolutamente sobre o card */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex justify-center pointer-events-none select-none z-[2]"
            style={{
              bottom: 'calc(100% - 20px)',
            }}
          >
            <VimoMascot />
          </div>

          {/* CARD PRINCIPAL */}
          <div className="relative z-[3] w-full bg-[#181A24] rounded-t-[32px] sm:rounded-t-[36px] border-t border-[#2B2F42] px-5 sm:px-6 pt-6 pb-6 shadow-2xl">
            {erro && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-medium text-center">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {modo === 'cadastrar' && (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA0B3]">
                    <UserIcon size={18} className="stroke-[1.6]" />
                  </span>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#222536] border border-[#2B2F42] text-[14px] text-[#F7F3EE] placeholder-[#9CA0B3] focus:outline-none focus:border-[var(--primary)] transition font-normal"
                  />
                </div>
              )}

              {/* CAMPO: Seu e-mail */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA0B3]">
                  <Mail size={18} className="stroke-[1.6]" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#222536] border border-[#2B2F42] text-[14px] text-[#F7F3EE] placeholder-[#9CA0B3] focus:outline-none focus:border-[var(--primary)] transition font-normal"
                />
              </div>

              {/* CAMPO: Sua senha */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA0B3]">
                  <Lock size={18} className="stroke-[1.6]" />
                </span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full h-12 pl-10 pr-11 rounded-xl bg-[#222536] border border-[#2B2F42] text-[14px] text-[#F7F3EE] placeholder-[#9CA0B3] focus:outline-none focus:border-[var(--primary)] transition font-normal"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="w-11 h-11 absolute inset-y-0 right-0 flex items-center justify-center text-[#9CA0B3] hover:text-[#F7F3EE] transition-colors cursor-pointer"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                >
                  {mostrarSenha ? <EyeOff size={18} className="stroke-[1.6]" /> : <Eye size={18} className="stroke-[1.6]" />}
                </button>
              </div>

              {/* BOTÃO PRINCIPAL */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full h-12 mt-1 rounded-xl bg-[var(--primary)] hover:brightness-110 text-[var(--on-primary)] flex items-center justify-center relative px-5 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <span className="text-[15px] font-semibold tracking-wide">
                  {carregando ? 'Acessando...' : modo === 'entrar' ? 'Entrar' : 'Cadastrar'}
                </span>
                <ArrowRight size={18} className="absolute right-4.5 stroke-[2.2]" />
              </button>
            </form>

            {/* DIVISOR: ──────── ou ──────── */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="w-full border-t border-[#2B2F42]" />
              <span className="bg-[#181A24] px-3 text-[12px] text-[#9CA0B3] font-normal absolute">
                ou
              </span>
            </div>

            {/* LOGIN SOCIAL: GOOGLE | APPLE */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={carregando}
                className="h-12 px-3 rounded-xl bg-[#222536] hover:bg-[#2A2E44] border border-[#2B2F42] flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer min-h-[44px]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <div className="text-[12px] font-medium leading-[1.2] text-[#F7F3EE] shrink-0">
                  <span className="block whitespace-nowrap">Google</span>
                </div>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={carregando}
                className="h-12 px-3 rounded-xl bg-[#222536] hover:bg-[#2A2E44] border border-[#2B2F42] flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer min-h-[44px]"
              >
                <svg className="w-5 h-5 shrink-0 fill-[#F7F3EE]" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.02-14.42-6.53-9.92-11.75-21.2-15.66-33.84-3.91-12.64-5.87-24.64-5.87-36 0-14.54 3.75-26.85 11.25-36.93 7.5-10.08 17.06-15.22 28.68-15.42 5.02 0 10.42 1.34 16.21 4.02 5.79 2.68 9.54 4.07 11.25 4.17 1.57 0 5.48-1.42 11.74-4.25 6.26-2.83 11.66-4.13 16.21-3.9 12.05.67 21.84 5.39 29.37 14.15-10.49 6.37-15.64 15.2-15.44 26.51.2 8.71 3.52 16.03 9.97 21.97 6.45 5.94 14.12 9.29 23 10.05-2.12 6.53-4.8 13.12-8.03 19.78zm-30.85-115.53c0 7.15-2.6 13.91-7.81 20.28-5.21 6.37-11.63 10.35-19.26 11.95-.33-1.63-.5-3.13-.5-4.5 0-7.05 2.82-14.07 8.46-21.05 5.64-6.98 12.01-10.88 19.11-11.68z" />
                </svg>
                <div className="text-[12px] font-medium leading-[1.2] text-[#F7F3EE] shrink-0">
                  <span className="block whitespace-nowrap">Apple</span>
                </div>
              </button>
            </div>

            {/* RODAPÉ */}
            <div className="pt-3 pb-0.5 text-center text-[13px] text-[#9CA0B3]">
              {modo === 'entrar' ? (
                <p>
                  Ainda não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModo('cadastrar');
                      setErro(null);
                    }}
                    className="font-medium text-[var(--primary)] hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                  >
                    Criar conta
                  </button>
                </p>
              ) : (
                <p>
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModo('entrar');
                      setErro(null);
                    }}
                    className="font-medium text-[var(--primary)] hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                  >
                    Fazer login
                  </button>
                </p>
              )}

              {onExploreAsGuest && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={onExploreAsGuest}
                    className="text-[12px] text-[#9CA0B3] hover:text-[#F7F3EE] transition min-h-[44px] inline-flex items-center justify-center cursor-pointer"
                  >
                    Entrar como convidado
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
