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

const ICONE =
  'pointer-events-none absolute left-[14px] top-1/2 h-[19px] w-[19px] -translate-y-1/2 text-[#6E6960]';
const CAMPO =
  'h-[52px] w-full rounded-[15px] border border-[#E7E0D5] bg-white pl-[43px] pr-[14px] text-[15px] text-[#121219] outline-none transition placeholder:text-[#9B958A] focus:border-[#F77947] focus:shadow-[0_0_0_3px_rgba(247,121,71,0.16)]';
const CAMPO_SENHA = CAMPO.replace('pr-[14px]', 'pr-[50px]');
const SOCIAL =
  'flex min-h-[54px] items-center justify-center gap-[9px] rounded-[15px] border border-[#E7E0D5] bg-white px-2 text-left text-[13.5px] font-medium leading-[1.2] text-[#121219] transition active:scale-[0.98] disabled:opacity-60';

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

  const cobrindo = senhaFocada && !mostrarSenha;

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden flex justify-center font-sans antialiased text-[#E8EAF2]"
      style={{
        background:
          'radial-gradient(118% 62% at 72% 6%, rgba(31,49,99,0.7) 0%, rgba(31,49,99,0) 62%), linear-gradient(180deg,#171A2E 0%,#111119 48%,#0B0B11 100%)',
      }}
    >
      <div className="relative flex h-full w-full max-w-[400px] flex-col overflow-y-auto">
        {/* Logo e slogan */}
        <div className="relative z-[2] px-[22px] pt-[calc(env(safe-area-inset-top,0px)+24px)]">
          <h1 className="m-0 select-none text-[40px] font-[900] leading-none tracking-[-0.045em] text-white">
            VIMO<span className="text-[#F77947]">.</span>
          </h1>
          <p className="mb-0 mt-[9px] text-[15px] leading-[1.3] text-[#DDE2F0]">
            Mais do que
            <br />
            restaurantes,
            <br />
            boas companhias.
          </p>
          <div className="mt-[11px] h-[3.5px] w-[38px] rounded-full bg-[#F77947]" />
        </div>

        {/* Mascote apoiado no card + card de formulário */}
        <div className="relative mt-auto">
          <VimoMascot coberto={cobrindo} />

          <div
            className="relative z-[3] rounded-t-[30px] bg-[#FAF7F1] px-5 pb-5 pt-[34px] text-[#121219]"
            style={{ boxShadow: '0 -10px 34px rgba(4,7,18,0.42)' }}
          >
            {erro && (
              <div
                role="alert"
                className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-[13px] font-medium text-red-700"
              >
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              {modo === 'cadastrar' && (
                <div className="relative mb-[11px]">
                  <UserIcon size={19} strokeWidth={1.7} className={ICONE} aria-hidden="true" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    aria-label="Seu nome completo"
                    className={CAMPO}
                  />
                </div>
              )}

              <div className="relative mb-[11px]">
                <Mail size={19} strokeWidth={1.7} className={ICONE} aria-hidden="true" />
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

              <div className="relative mb-[11px]">
                <Lock size={19} strokeWidth={1.7} className={ICONE} aria-hidden="true" />
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
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-[#6E6960] transition-colors hover:text-[#121219]"
                >
                  {mostrarSenha ? <EyeOff size={19} strokeWidth={1.7} /> : <Eye size={19} strokeWidth={1.7} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="relative mt-1 flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#121219] text-[16px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {carregando ? 'Acessando...' : modo === 'entrar' ? 'Entrar' : 'Cadastrar'}
                {!carregando && <ArrowRight size={20} strokeWidth={2.1} className="absolute right-5" aria-hidden="true" />}
              </button>
            </form>

            <div className="my-[15px] mb-3 flex items-center gap-3 text-[13px] text-[#9B958A]">
              <span className="h-px flex-1 bg-[#E7E0D5]" />
              <span>ou</span>
              <span className="h-px flex-1 bg-[#E7E0D5]" />
            </div>

            <div className="grid grid-cols-2 gap-[10px]">
              <button type="button" onClick={handleGoogleLogin} disabled={carregando} className={SOCIAL}>
                <svg className="h-[21px] w-[21px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                </svg>
                <span>
                  Continuar
                  <br />
                  com Google
                </span>
              </button>
              <button type="button" onClick={handleAppleLogin} disabled={carregando} className={SOCIAL}>
                <svg className="h-[21px] w-[21px] shrink-0 fill-[#121219]" viewBox="0 0 170 170" aria-hidden="true">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.02-14.42-6.53-9.92-11.75-21.2-15.66-33.84-3.91-12.64-5.87-24.64-5.87-36 0-14.54 3.75-26.85 11.25-36.93 7.5-10.08 17.06-15.22 28.68-15.42 5.02 0 10.42 1.34 16.21 4.02 5.79 2.68 9.54 4.07 11.25 4.17 1.57 0 5.48-1.42 11.74-4.25 6.26-2.83 11.66-4.13 16.21-3.9 12.05.67 21.84 5.39 29.37 14.15-10.49 6.37-15.64 15.2-15.44 26.51.2 8.71 3.52 16.03 9.97 21.97 6.45 5.94 14.12 9.29 23 10.05-2.12 6.53-4.8 13.12-8.03 19.78zm-30.85-115.53c0 7.15-2.6 13.91-7.81 20.28-5.21 6.37-11.63 10.35-19.26 11.95-.33-1.63-.5-3.13-.5-4.5 0-7.05 2.82-14.07 8.46-21.05 5.64-6.98 12.01-10.88 19.11-11.68z" />
                </svg>
                <span>
                  Continuar
                  <br />
                  com Apple
                </span>
              </button>
            </div>

            <div className="mt-[15px] text-center text-[13.5px] text-[#6E6960]">
              {modo === 'entrar' ? (
                <p className="m-0">
                  Ainda não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModo('cadastrar');
                      setErro(null);
                    }}
                    className="font-semibold text-[#1F3163] hover:underline"
                  >
                    Criar conta
                  </button>
                </p>
              ) : (
                <p className="m-0">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModo('entrar');
                      setErro(null);
                    }}
                    className="font-semibold text-[#1F3163] hover:underline"
                  >
                    Fazer login
                  </button>
                </p>
              )}

              {onExploreAsGuest && (
                <button
                  type="button"
                  onClick={onExploreAsGuest}
                  className="mt-1 inline-flex min-h-[40px] items-center justify-center text-[13px] text-[#9B958A] underline transition hover:text-[#121219]"
                >
                  Entrar como convidado
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
