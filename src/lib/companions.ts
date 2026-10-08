import type { Review, ReviewCompanion, CompanionStatus } from '../types';
import { getLocalReviews, saveLocalReviews } from './reviews';

export interface UserToTag {
  uid: string;
  name: string;
  handle: string;
  photo: string;
  bio?: string;
}

export const COMMUNITY_USERS: UserToTag[] = [
  {
    uid: 'user-camila',
    name: 'Camila Duarte',
    handle: '@camilagourmet',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    bio: 'Apaixonada por alta gastronomia, cafés especiais e padarias artesanais.',
  },
  {
    uid: 'user-pedro',
    name: 'Pedro Lima',
    handle: '@pedrogastro',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    bio: 'Explorador de bistrôs, vinhos naturais e comida de rua.',
  },
  {
    uid: 'user-lucas',
    name: 'Lucas Ferraz',
    handle: '@lucascoffee',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    bio: 'Barista amador e apreciador de grãos especiais da Mantiqueira.',
  },
  {
    uid: 'user-bia',
    name: 'Beatriz Ramos',
    handle: '@biaprados',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    bio: 'Coquetelaria autoral, botecos clássicos e gastronomia afetiva.',
  },
  {
    uid: 'user-mariana',
    name: 'Mariana Souza',
    handle: '@marisouza',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    bio: 'Sommelière e caçadora das melhores massas artesanais.',
  },
];

// Busca usuários da comunidade para marcar na avaliação
export function buscarUsuariosParaMarcar(termo: string, currentUserUid: string): UserToTag[] {
  const norm = termo.trim().toLowerCase().replace(/^@/, '');
  return COMMUNITY_USERS.filter((u) => {
    if (u.uid === currentUserUid) return false;
    if (!norm) return true;
    return (
      u.name.toLowerCase().includes(norm) ||
      u.handle.toLowerCase().includes(norm)
    );
  });
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
