import type { Review, ReviewCompanion, CompanionStatus } from '../types';
import { getLocalReviews, saveLocalReviews } from './reviews';

export interface UserToTag {
  uid: string;
  name: string;
  handle: string;
  photo: string;
  bio?: string;
}

// Retorna as avaliações em que o usuário foi marcado e ainda estão pendentes
export function obterSolicitacoesPendentes(userUid: string): { review: Review; companion: ReviewCompanion }[] {
  const reviews: Review[] = getLocalReviews();
  const pendentes: { review: Review; companion: ReviewCompanion }[] = [];

  for (const r of reviews) {
    if (r.companions && r.companions.length > 0) {
      const meuRegistro = r.companions.find((c: ReviewCompanion) => c.uid === userUid && c.status === 'pendente');
      if (meuRegistro) {
        pendentes.push({ review: r, companion: meuRegistro });
      }
    }
  }

  return pendentes;
}

// Responde a uma solicitação de marcação
export function responderSolicitacaoMarcacao(
  reviewId: string,
  userUid: string,
  resposta: CompanionStatus
): boolean {
  const reviews: Review[] = getLocalReviews();
  let alterado = false;

  const atualizadas = reviews.map((r: Review) => {
    if (r.id === reviewId && r.companions) {
      const novosCompanions = r.companions.map((c: ReviewCompanion) => {
        if (c.uid === userUid) {
          alterado = true;
          return {
            ...c,
            status: resposta,
            respondedAt: Date.now(),
          };
        }
        return c;
      });
      return { ...r, companions: novosCompanions };
    }
    return r;
  });

  if (alterado) {
    saveLocalReviews(atualizadas);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('garfo:review_updated', { detail: { reviewId } }));
    }
  }

  return alterado;
}
