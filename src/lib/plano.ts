import type { UserProfile } from '../types';

/**
 * Plano do usuário. Hoje o VIMO PRO libera a vitrine de medalhas no perfil;
 * os próximos recursos do plano ainda serão definidos.
 *
 * Como ativar: grave `plano: 'pro'` no documento `users/{uid}` do Firestore
 * (no futuro, isso será feito pela integração de pagamento).
 * Em desenvolvimento, `?pro=1` na URL liga o modo PRO de teste neste aparelho
 * e `?pro=0` desliga. Em produção esse atalho não existe.
 */
const CHAVE_TESTE = 'vimo_pro_teste';
const CHAVE_INTERESSE = 'vimo_pro_interesse';

if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const p = new URLSearchParams(window.location.search).get('pro');
    if (p === '1') localStorage.setItem(CHAVE_TESTE, '1');
    if (p === '0') localStorage.removeItem(CHAVE_TESTE);
  } catch {}
}

export function ehPro(u?: Pick<UserProfile, 'plano'> | null): boolean {
  if (u?.plano === 'pro') return true;
  if (import.meta.env.DEV) {
    try {
      return localStorage.getItem(CHAVE_TESTE) === '1';
    } catch {}
  }
  return false;
}

/** Registra o interesse no PRO (lista de espera enquanto o pagamento não existe). */
export function registrarInteressePro(uid: string) {
  try {
    localStorage.setItem(CHAVE_INTERESSE, JSON.stringify({ uid, em: Date.now() }));
  } catch {}
}

export function jaDemonstrouInteresse(): boolean {
  try {
    return !!localStorage.getItem(CHAVE_INTERESSE);
  } catch {
    return false;
  }
}
