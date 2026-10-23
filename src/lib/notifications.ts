import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
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

/** Título curto usado no aviso do sistema (push). */
export function tituloNotificacao(n: Pick<NotificationItem, 'tipo' | 'remetente' | 'clubeNome'>): string {
  const quem = n.remetente.name;
  switch (n.tipo) {
    case 'curtida':
      return `${quem} curtiu sua publicação`;
    case 'comentario':
      return `${quem} comentou`;
    case 'marcacao_presenca':
      return `${quem} marcou você em um restaurante`;
    case 'clube_entrou':
      return `${quem} entrou no ${n.clubeNome ?? 'clube'}`;
    case 'clube_evento':
      return `Novo evento no ${n.clubeNome ?? 'clube'}`;
    case 'clube_removido':
      return `Você saiu do ${n.clubeNome ?? 'clube'}`;
    case 'clube_ultrapassou':
      return `${quem} passou você no ranking`;
    default:
      return `${quem} começou a seguir você`;
  }
}

function semUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function gravarRemoto(gravar: () => Promise<unknown>) {
  if (!isFirebaseConfigured) return;
  try {
    gravar().catch(() => {});
  } catch {}
}

/**
 * Cria a notificação para outra pessoa: grava neste aparelho e no Firestore
 * (users/{destinatario}/notificacoes), de onde o aparelho dela busca.
 */
export function criarNotificacao(
  destinatarioUid: string,
  notif: Omit<NotificationItem, 'id' | 'createdAt' | 'lida'>
): NotificationItem {
  const current = obterNotificacoes(destinatarioUid);
  const nova: NotificationItem = semUndefined({
    ...notif,
    id: 'notif-' + crypto.randomUUID().slice(0, 12),
    createdAt: Date.now(),
    lida: false,
  });

  const paraOutraPessoa = !!destinatarioUid && !!notif.remetente.uid && destinatarioUid !== notif.remetente.uid;
  if (paraOutraPessoa && isFirebaseConfigured) {
    gravarRemoto(() => setDoc(doc(db, 'users', destinatarioUid, 'notificacoes', nova.id), nova));
  } else {
    // sem servidor (modo de exemplo) a lista local é a única que existe
    salvarNotificacoes(destinatarioUid, [nova, ...current]);
  }

  return nova;
}

/** Avisa várias pessoas de uma vez (ex.: evento novo para o clube). */
export function notificarVarios(
  destinatarios: string[],
  notif: Omit<NotificationItem, 'id' | 'createdAt' | 'lida'>,
): void {
  for (const uid of new Set(destinatarios)) {
    if (uid && uid !== notif.remetente.uid) criarNotificacao(uid, notif);
  }
}

const sincronizando = new Map<string, Promise<void>>();

/**
 * Busca no servidor o que outras pessoas mandaram e junta com o que já está no aparelho.
 * Notificações novas e recentes geram um aviso do sistema quando a permissão existe.
 */
export function sincronizarNotificacoes(userUid: string): Promise<void> {
  if (!isFirebaseConfigured || !userUid) return Promise.resolve();
  const emAndamento = sincronizando.get(userUid);
  if (emAndamento) return emAndamento;
  const tarefa = (async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'users', userUid, 'notificacoes'), orderBy('createdAt', 'desc'), limit(60)),
      );
      const remotas = snap.docs.map((d) => ({ ...(d.data() as NotificationItem), id: d.id }));
      const locais = obterNotificacoes(userUid);
      const porId = new Map(locais.map((n) => [n.id, n]));
      const novas: NotificationItem[] = [];
      for (const r of remotas) {
        const local = porId.get(r.id);
        if (!local) {
          novas.push(r);
          porId.set(r.id, r);
        } else if (r.lida && !local.lida) {
          porId.set(r.id, { ...local, lida: true });
        }
      }
      if (novas.length === 0 && remotas.every((r) => !r.lida || porId.get(r.id)?.lida)) return;
      const lista = [...porId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
      salvarNotificacoes(userUid, lista);
      const recentes = novas.filter((n) => !n.lida && Date.now() - n.createdAt < 15 * 60_000);
      for (const n of recentes.slice(0, 3)) {
        try {
          dispararNotificacaoLocalPush({ titulo: tituloNotificacao(n), corpo: n.texto || '', icone: n.remetente.photo });
        } catch {}
      }
    } catch {
      // sem rede ou sem permissão: fica com o que está no aparelho
    } finally {
      sincronizando.delete(userUid);
    }
  })();
  sincronizando.set(userUid, tarefa);
  return tarefa;
}

export function marcarComoLida(userUid: string, notifId: string): void {
  const current = obterNotificacoes(userUid);
  const updated = current.map((n) => (n.id === notifId ? { ...n, lida: true } : n));
  salvarNotificacoes(userUid, updated);
  if (userUid) gravarRemoto(() => updateDoc(doc(db, 'users', userUid, 'notificacoes', notifId), { lida: true }));
}

export function marcarTodasComoLidas(userUid: string): void {
  const current = obterNotificacoes(userUid);
  const naoLidas = current.filter((n) => !n.lida);
  salvarNotificacoes(userUid, current.map((n) => ({ ...n, lida: true })));
  if (!userUid || naoLidas.length === 0) return;
  // só atualiza o que existe no servidor; o que nasceu neste aparelho falha em silêncio
  gravarRemoto(() => Promise.allSettled(naoLidas.map((n) => updateDoc(doc(db, 'users', userUid, 'notificacoes', n.id), { lida: true }))));
}

export function removerNotificacao(userUid: string, notifId: string): void {
  const current = obterNotificacoes(userUid);
  const updated = current.filter((n) => n.id !== notifId);
  salvarNotificacoes(userUid, updated);
  if (userUid) gravarRemoto(() => deleteDoc(doc(db, 'users', userUid, 'notificacoes', notifId)));
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
