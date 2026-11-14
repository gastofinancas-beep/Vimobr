import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { cachePlace, MEMORY_PLACES_CACHE, buscarPorGooglePlaceId } from './places';
import type { Place } from '../types';

/** O servidor só atende quem está logado: o token do Firebase vai no pedido. */
async function cabecalhos(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export type StatusVerificacao = 'verifying' | 'verified' | 'pending_review' | 'verification_error';

export type ResultadoVerificacao = {
  status: StatusVerificacao;
  /** Lugar já existente no Vimo com o mesmo googlePlaceId — substitui o recém-criado */
  lugarExistente?: Place;
};

export type ResultadoPreVerificacao = {
  /** true = Google confirmou, pode criar o lugar */
  ok: boolean;
  /** Por que o servidor nem chegou a consultar: sem login ou limite do dia */
  motivo?: 'login' | 'limite';
  googlePlaceId?: string;
  /** Lugar Vimo já existente com esse googlePlaceId */
  lugarExistente?: Place;
};

/**
 * Verifica o lugar NO GOOGLE ANTES de criar qualquer registro no Vimo.
 * Retorna ok=false se o Google não confirmar — nesse caso o lugar não deve ser salvo.
 */
export async function verificarAntesDeRegistrar(
  nome: string,
  endereco: string,
): Promise<ResultadoPreVerificacao> {
  try {
    const resp = await fetch('/api/verificar-lugar', {
      method: 'POST',
      headers: await cabecalhos(),
      body: JSON.stringify({ nome, endereco }),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.status === 401) return { ok: false, motivo: 'login' };
    if (resp.status === 429) return { ok: false, motivo: 'limite' };
    if (!resp.ok) return { ok: false };

    const data = await resp.json() as { status: StatusVerificacao; googlePlaceId?: string };

    if (data.status !== 'verified' || !data.googlePlaceId) {
      return { ok: false };
    }

    // Deduplicação: lugar com esse googlePlaceId já existe no Vimo?
    const existente = await buscarPorGooglePlaceId(data.googlePlaceId);
    if (existente) {
      return { ok: true, googlePlaceId: data.googlePlaceId, lugarExistente: existente };
    }

    return { ok: true, googlePlaceId: data.googlePlaceId };
  } catch {
    return { ok: false };
  }
}

/**
 * Chama o backend para verificar se o lugar existe no Google Places.
 * Se confirmado: grava o googlePlaceId no registro Vimo (chave de deduplicação).
 * Se já houver outro lugar Vimo com o mesmo googlePlaceId: retorna o existente.
 * Dados do Google (nome, endereço, coordenadas) NÃO são copiados — os Termos do Google
 * só permitem armazenar o place_id de forma persistente.
 */
export async function verificarLugar(
  placeId: string,
  nome: string,
  endereco: string,
): Promise<ResultadoVerificacao> {
  try {
    const resp = await fetch('/api/verificar-lugar', {
      method: 'POST',
      headers: await cabecalhos(),
      body: JSON.stringify({ placeId, nome, endereco }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      await _gravarStatus(placeId, 'verification_error');
      return { status: 'verification_error' };
    }

    const data = await resp.json() as { status: StatusVerificacao; googlePlaceId?: string };

    if (data.status === 'verified' && data.googlePlaceId) {
      // Deduplicação: se já existe outro lugar Vimo com esse googlePlaceId, usa ele
      const existente = await buscarPorGooglePlaceId(data.googlePlaceId);
      if (existente && existente.id !== placeId) {
        await _gravarStatus(placeId, 'verified', data.googlePlaceId);
        return { status: 'verified', lugarExistente: existente };
      }
    }

    await _gravarStatus(placeId, data.status, data.googlePlaceId);
    return { status: data.status };
  } catch {
    await _gravarStatus(placeId, 'verification_error');
    return { status: 'verification_error' };
  }
}

async function _gravarStatus(placeId: string, status: StatusVerificacao, googlePlaceId?: string) {
  const update: Record<string, unknown> = { verificacao: status };
  if (googlePlaceId) update.googlePlaceId = googlePlaceId;

  const cached = MEMORY_PLACES_CACHE.get(placeId);
  if (cached) {
    cachePlace({ ...cached, verificacao: status, ...(googlePlaceId ? { googlePlaceId } : {}) });
  }

  try {
    await updateDoc(doc(db, 'places', placeId), update);
  } catch { /* silencioso */ }
}
