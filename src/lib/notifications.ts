import type { NotificationItem, CompanionStatus } from '../types';
import { responderSolicitacaoMarcacao } from './companions';
import { dispararNotificacaoLocalPush } from './fcm';

const LS_NOTIFICATIONS_PREFIX = 'vimo_notifications_v2_';

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    tipo: 'marcacao_presenca',
    remetente: {
      uid: 'user-bia',
      name: 'Beatriz Ramos',
      handle: '@biaprados',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    reviewId: 'rev-04',
    placeId: 'chIJf-place-04',
    placeName: 'Bar do Canto & Coquetelaria',
    texto: 'marcou você como companhia na avaliação de Bar do Canto & Coquetelaria. Escolha como quer aparecer.',
    lida: false,
    createdAt: Date.now() - 1000 * 60 * 25, // 25 min atrás
    companionStatus: 'pendente',
  },
  {
    id: 'notif-2',
    tipo: 'curtida',
    remetente: {
      uid: 'user-camila',
      name: 'Camila Duarte',
      handle: '@camilagourmet',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    reviewId: 'rev-01',
    placeId: 'chIJf-place-01',
    placeName: 'Maniçoba Bistrô & Café',
    texto: 'curtiu sua avaliação sobre o Maniçoba Bistrô & Café.',
    lida: false,
    createdAt: Date.now() - 1000 * 60 * 90, // 1h30 atrás
  },
  {
    id: 'notif-3',
    tipo: 'comentario',
    remetente: {
      uid: 'user-pedro',
      name: 'Pedro Lima',
      handle: '@pedrogastro',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    reviewId: 'rev-01',
    placeId: 'chIJf-place-01',
    placeName: 'Maniçoba Bistrô & Café',
    texto: 'comentou: "Esse tartare é espetacular! Pediu a sobremesa de castanha também?"',
    lida: false,
    createdAt: Date.now() - 1000 * 60 * 180, // 3h atrás
  },
  {
    id: 'notif-4',
    tipo: 'seguir',
    remetente: {
      uid: 'user-lucas',
      name: 'Lucas Ferraz',
      handle: '@lucascoffee',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    texto: 'começou a seguir o seu diário gastronômico.',
    lida: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 dia atrás
  },
];

function notifyListeners() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('garfo:notifications_updated'));
  }
}

export function obterNotificacoes(userUid: string): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LS_NOTIFICATIONS_PREFIX + userUid);
    // Só dados reais: sem notificações de demonstração para usuários novos
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function salvarNotificacoes(userUid: string, notifs: NotificationItem[]): void {
  try {
    localStorage.setItem(LS_NOTIFICATIONS_PREFIX + userUid, JSON.stringify(notifs));
    notifyListeners();
  } catch (err) {
    console.error('Erro ao salvar notificações:', err);
  }
}

export function criarNotificacao(
  destinatarioUid: string,
  notif: Omit<NotificationItem, 'id' | 'createdAt' | 'lida'>
): NotificationItem {
  const current = obterNotificacoes(destinatarioUid);
  const nova: NotificationItem = {
    ...notif,
    id: 'notif-' + crypto.randomUUID().slice(0, 8),
    createdAt: Date.now(),
    lida: false,
  };

  salvarNotificacoes(destinatarioUid, [nova, ...current]);

  // Dispara a Notificação Push (FCM / Web Push)
  try {
    const titulo =
      notif.tipo === 'curtida'
        ? `${notif.remetente.name} curtiu sua avaliação`
        : notif.tipo === 'comentario'
        ? `${notif.remetente.name} comentou na sua avaliação`
        : notif.tipo === 'marcacao_presenca'
        ? `${notif.remetente.name} marcou você em um restaurante`
        : `${notif.remetente.name} começou a seguir você`;

    dispararNotificacaoLocalPush({
      titulo,
      corpo: notif.texto || 'Você recebeu uma nova interação no seu diário.',
      icone: notif.remetente.photo,
    });
  } catch (pushErr) {
    console.warn('Erro ao disparar push notification:', pushErr);
  }

  return nova;
}

export function marcarComoLida(userUid: string, notifId: string): void {
  const current = obterNotificacoes(userUid);
  const updated = current.map((n) => (n.id === notifId ? { ...n, lida: true } : n));
  salvarNotificacoes(userUid, updated);
}

export function marcarTodasComoLidas(userUid: string): void {
  const current = obterNotificacoes(userUid);
  const updated = current.map((n) => ({ ...n, lida: true }));
  salvarNotificacoes(userUid, updated);
}

export function removerNotificacao(userUid: string, notifId: string): void {
  const current = obterNotificacoes(userUid);
  const updated = current.filter((n) => n.id !== notifId);
  salvarNotificacoes(userUid, updated);
}

export function contarNaoLidas(userUid: string): number {
  const notifs = obterNotificacoes(userUid);
  return notifs.filter((n) => !n.lida).length;
}

export function responderNotificacaoMarcacao(
  userUid: string,
  notifId: string,
  reviewId: string,
  resposta: CompanionStatus
): void {
  // Atualiza a review no sistema de avaliações
  responderSolicitacaoMarcacao(reviewId, userUid, resposta);

  // Atualiza o estado da notificação
  const current = obterNotificacoes(userUid);
  const updated = current.map((n) => {
    if (n.id === notifId) {
      return {
        ...n,
        lida: true,
        companionStatus: resposta,
        texto:
          resposta === 'aprovado_coautor'
            ? 'Avaliação adicionada ao seu Diário'
            : resposta === 'aprovado_presenca'
            ? 'Presença confirmada'
            : 'Marcação recusada.',
      };
    }
    return n;
  });

  salvarNotificacoes(userUid, updated);
}
