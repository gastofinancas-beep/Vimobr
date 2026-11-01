import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cachePlace, MEMORY_PLACES_CACHE, buscarPorGooglePlaceId, enriquecerLugar } from './places';
import type { Place } from '../types';

export type StatusVerificacao = 'verifying' | 'verified' | 'pending_review' | 'verification_error';

export type ResultadoVerificacao = {
  status: StatusVerificacao;
  /** Lugar já existente no Vimo com o mesmo googlePlaceId — substitui o recém-criado */
  lugarExistente?: Place;
};

/**
 * Chama o backend para verificar o lugar.
 * Se verificado: enriquece o registro Vimo com dados do Google (nome, endereço, lat/lng).
 * Se já existir um lugar Vimo com o mesmo googlePlaceId: retorna esse lugar para evitar duplicata.
 */
export async function verificarLugar(
  placeId: string,
  nome: string,
  endereco: string,
): Promise<ResultadoVerificacao> {
  try {
    const resp = await fetch('/api/verificar-lugar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, nome, endereco }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      await _gravarStatus(placeId, 'verification_error');
      return { status: 'verification_error' };
    }

    const data = await resp.json() as {
      status: StatusVerificacao;
      googlePlaceId?: string;
      enrichedData?: { name: string; address: string; lat: number; lng: number };
    };

    if (data.status === 'verified' && data.googlePlaceId) {
      // Verifica se já existe outro lugar Vimo com esse googlePlaceId (deduplicação)
      const existente = await buscarPorGooglePlaceId(data.googlePlaceId);
      if (existente && existente.id !== placeId) {
        // Já existe — marca o recém-criado como duplicata e retorna o lugar original
        await _gravarStatus(placeId, 'verified', data.googlePlaceId);
        return { status: 'verified', lugarExistente: existente };
      }

      // Enriquece o registro com dados do Google
      if (data.enrichedData) {
        await enriquecerLugar(placeId, { googlePlaceId: data.googlePlaceId, ...data.enrichedData });
      } else {
        await _gravarStatus(placeId, 'verified', data.googlePlaceId);
      }
      return { status: 'verified' };
    }

    await _gravarStatus(placeId, data.status);
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
