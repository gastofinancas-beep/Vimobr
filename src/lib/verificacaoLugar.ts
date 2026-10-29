import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cachePlace, MEMORY_PLACES_CACHE } from './places';

export type StatusVerificacao = 'verifying' | 'verified' | 'pending_review' | 'verification_error';

/** Chama o backend para verificar o lugar e grava o resultado no Firestore e no cache local. */
export async function verificarLugar(placeId: string, nome: string, endereco: string): Promise<StatusVerificacao> {
  try {
    const resp = await fetch('/api/verificar-lugar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, nome, endereco }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      await _gravarStatus(placeId, 'verification_error');
      return 'verification_error';
    }

    const data = await resp.json() as { status: StatusVerificacao; googlePlaceId?: string };
    await _gravarStatus(placeId, data.status, data.googlePlaceId);
    return data.status;
  } catch {
    await _gravarStatus(placeId, 'verification_error');
    return 'verification_error';
  }
}

async function _gravarStatus(placeId: string, status: StatusVerificacao, googlePlaceId?: string) {
  const update: Record<string, unknown> = { verificacao: status };
  if (googlePlaceId) update.googlePlaceId = googlePlaceId;

  // Atualiza cache local
  const cached = MEMORY_PLACES_CACHE.get(placeId);
  if (cached) {
    cachePlace({ ...cached, verificacao: status, ...(googlePlaceId ? { googlePlaceId } : {}) });
  }

  // Atualiza Firestore em segundo plano
  try {
    await updateDoc(doc(db, 'places', placeId), update);
  } catch { /* silencioso */ }
}
