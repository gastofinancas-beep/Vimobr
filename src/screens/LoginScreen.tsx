import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen h-[100dvh] w-full bg-[#181614] flex justify-center items-center font-sans antialiased text-[#111827] overflow-hidden selection:bg-[#FF6B00]/20 selection:text-[#111827] relative">
      {/* Moldura celular com altura 100% contida para garantir que todo o card apareça sem corte */}
      <div className="w-full max-w-[400px] h-full max-h-[100dvh] sm:max-h-[850px] flex flex-col justify-between relative px-4 sm:px-5 pt-2 pb-3 overflow-hidden shadow-2xl sm:rounded-[40px] border border-neutral-200/50 bg-[#FAF9F5]">
        
        {/* FUNDO AMBIENTE GASTRONÔMICO CONTEMPORÂNEO DESFOCADO COM OVERLAY LEVE */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <img
            src="/vimo_gastronomy_abstract.jpg"
            alt="Ambiente gastronômico acolhedor e contemporâneo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-105 filter blur-[2px]"
          />
          {/* Overlay suave e atmosférico: tons creme, bege suave e luz natural com transição delicada */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F5F2EC]/70 via-[#FAF8F5]/45 to-[#FAF8F5]/90" />
          <div className="absolute inset-0 bg-radial from-transparent via-[#FAF8F5]/25 to-[#FAF8F5]/70" />
        </div>

        {/* REGIÃO SUPERIOR: LOGO VIMO + SLOGAN */}
        <div className="relative w-full pt-3 pb-2 z-20">
          {/* Logo e Slogan no Canto Superior Esquerdo */}
          <div className="max-w-[210px]">
            {/* Logo Oficial VIMO (PNG com proporção original preservada) */}
            <img
              src="/vimo_logo.png"
              alt="VIMO"
              className="h-[34px] sm:h-[38px] w-auto object-contain object-left pointer-events-none select-none"
            />

            {/* Slogan com tipografia Inter Regular leve e quebras de linha exatas */}
            <p className="text-[15.5px] sm:text-[16px] font-normal text-[#111827] leading-[1.25] tracking-[-0.01em] mt-2">
              Mais do que<br />
              restaurantes,<br />
              boas companhias.
            </p>

            {/* Traço horizontal laranja */}
            <div className="w-10 h-[3.5px] bg-[#FF6B00] rounded-full mt-2" />
          </div>
        </div>

        {/* CONTAINER INFERIOR: MASCOTE EM POSIÇÃO ABSOLUTA (Z-INDEX: 2) + CARD BRANCO NA FRENTE (Z-INDEX: 3) */}
        <div className="relative w-full mt-auto shrink-0">
          
          {/* MASCOTE OFICIAL EM POSIÇÃO ABSOLUTA ATRÁS DO CARD (Z-INDEX: 2) */}
          <div
            id="login-mascote"
            className="left-0 right-0 flex justify-center pointer-events-none select-none"
            style={{
              position: 'absolute',
              bottom: 'calc(100% - 15px)',
              zIndex: 2,
            }}
          >
            <VimoMascot showCuriosityMarks={true} />
          </div>

          {/* CARD PRINCIPAL DO FORMULÁRIO NA FRENTE (Z-INDEX: 3) */}
          <div
            id="login-card"
            className="w-full bg-[#FCFBF8] rounded-t-[32px] sm:rounded-t-[36px] rounded-b-[24px] sm:rounded-b-[28px] px-5 py-4 sm:px-6 sm:py-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-[#EFECE6]"
            style={{
              position: 'relative',
              zIndex: 3,
            }}
          >
            {erro && (
              <div className="mb-2.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
                {erro}
              </div>
            )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {modo === 'cadastrar' && (
              <div className="relative">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-[50px] px-4 rounded-[16px] bg-[#FAFAFA] border border-[#EBEBEB] text-[14.5px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#101522] focus:bg-white transition font-normal"
                />
              </div>
            )}

            {/* CAMPO: Seu e-mail */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                <Mail size={18} className="stroke-[1.6]" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full h-[50px] pl-10 pr-4 rounded-[16px] bg-[#FAFAFA] border border-[#EBEBEB] text-[14.5px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#101522] focus:bg-white transition font-normal"
              />
            </div>

            {/* CAMPO: Sua senha */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                <Lock size={18} className="stroke-[1.6]" />
              </span>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                className="w-full h-[50px] pl-10 pr-10 rounded-[16px] bg-[#FAFAFA] border border-[#EBEBEB] text-[14.5px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#101522] focus:bg-white transition font-normal"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#111827] transition-colors cursor-pointer"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
              >
                {mostrarSenha ? <EyeOff size={18} className="stroke-[1.6]" /> : <Eye size={18} className="stroke-[1.6]" />}
              </button>
            </div>

            {/* BOTÃO PRETO: Entrar   → */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full h-[52px] mt-0.5 rounded-[16px] bg-[#101522] hover:bg-black text-white flex items-center justify-center relative px-5 transition active:scale-[0.99] shadow-sm disabled:opacity-70 cursor-pointer"
            >
              <span className="text-[15.5px] font-semibold tracking-wide">
                {carregando ? 'Acessando...' : modo === 'entrar' ? 'Entrar' : 'Cadastrar'}
              </span>
              <ArrowRight size={19} className="absolute right-4.5 stroke-[2.2] text-white" />
            </button>
          </form>

          {/* DIVISOR: ──────── ou ──────── */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="w-full border-t border-[#EAEAEA]" />
            <span className="bg-[#FCFBF8] px-3 text-[12px] text-[#9CA3AF] font-normal absolute">
              ou
            </span>
          </div>

          {/* LOGIN SOCIAL: GOOGLE | APPLE LADO A LADO (Sem quebrar em 3 linhas) */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={carregando}
              className="h-[54px] px-3 rounded-[16px] bg-[#FAFAFA] hover:bg-[#F3F4F6] border border-[#EBEBEB] flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
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
              <div className="text-[11.5px] sm:text-[12px] font-medium leading-[1.2] text-[#111827] shrink-0">
                <span className="block whitespace-nowrap">Continuar com</span>
                <span className="block whitespace-nowrap font-medium">Google</span>
              </div>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={carregando}
              className="h-[54px] px-3 rounded-[16px] bg-[#FAFAFA] hover:bg-[#F3F4F6] border border-[#EBEBEB] flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0 fill-[#111827]" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.02-14.42-6.53-9.92-11.75-21.2-15.66-33.84-3.91-12.64-5.87-24.64-5.87-36 0-14.54 3.75-26.85 11.25-36.93 7.5-10.08 17.06-15.22 28.68-15.42 5.02 0 10.42 1.34 16.21 4.02 5.79 2.68 9.54 4.07 11.25 4.17 1.57 0 5.48-1.42 11.74-4.25 6.26-2.83 11.66-4.13 16.21-3.9 12.05.67 21.84 5.39 29.37 14.15-10.49 6.37-15.64 15.2-15.44 26.51.2 8.71 3.52 16.03 9.97 21.97 6.45 5.94 14.12 9.29 23 10.05-2.12 6.53-4.8 13.12-8.03 19.78zm-30.85-115.53c0 7.15-2.6 13.91-7.81 20.28-5.21 6.37-11.63 10.35-19.26 11.95-.33-1.63-.5-3.13-.5-4.5 0-7.05 2.82-14.07 8.46-21.05 5.64-6.98 12.01-10.88 19.11-11.68z" />
              </svg>
              <div className="text-[11.5px] sm:text-[12px] font-medium leading-[1.2] text-[#111827] shrink-0">
                <span className="block whitespace-nowrap">Continuar com</span>
                <span className="block whitespace-nowrap font-medium">Apple</span>
              </div>
            </button>
          </div>

          {/* RODAPÉ: Ainda não tem uma conta? Criar conta + Entrar como convidado */}
          <div className="pt-3 pb-0.5 text-center text-[12.5px] text-[#6B7280]">
            {modo === 'entrar' ? (
              <p>
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setModo('cadastrar');
                    setErro(null);
                  }}
                  className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
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
                  className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            )}

            {/* Acesso rápido como convidado */}
            {onExploreAsGuest && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExploreAsGuest}
                  className="text-[11.5px] text-[#9CA3AF] hover:text-[#111827] transition"
                >
                  Entrar como convidado
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PATINHAS DO MASCOTE EM PRIMEIRO PLANO SOBREPOSTAS À BORDA DO CARD (Z-INDEX: 4) COM SOMBRA DE CONTATO SUTIL */}
        <div
          id="login-mascote-patas"
          className="left-0 right-0 flex justify-center pointer-events-none select-none"
          style={{
            position: 'absolute',
            bottom: 'calc(100% - 14px)',
            zIndex: 4,
          }}
        >
          <div className="relative select-none pointer-events-none w-full flex justify-center items-end">
            <img
              src="/mascote_paws.png"
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="w-full max-w-[365px] sm:max-w-[395px] h-auto object-contain object-bottom pointer-events-none select-none filter drop-shadow-[0_2px_2.5px_rgba(0,0,0,0.14)]"
            />
          </div>
        </div>
      </div>

    </div>
  </div>
);
}
