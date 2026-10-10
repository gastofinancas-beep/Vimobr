import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db, isFirebaseConfigured, fcmConfig } from './firebase';

let messagingInstance: Messaging | null = null;
let initialized = false;

export async function getFCM(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (supported && isFirebaseConfigured) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('FCM não suportado ou erro ao inicializar:', err);
  }
  return null;
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return reg;
  } catch (err) {
    console.warn('Erro ao registrar Service Worker do FCM:', err);
    return null;
  }
}

export async function solicitarPermissaoNotificacoes(userUid?: string): Promise<{
  granted: boolean;
  token?: string;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, error: 'Notificações não são suportadas neste navegador.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, error: 'Permissão de notificação negada pelo usuário.' };
    }

    const swReg = await registrarServiceWorker();
    const messaging = await getFCM();

    let token: string | undefined;

    if (messaging && swReg) {
      try {
        token = await getToken(messaging, {
          serviceWorkerRegistration: swReg,
        });

        if (token && userUid && isFirebaseConfigured) {
          await setDoc(
            doc(db, `users/${userUid}/fcmTokens`, token.slice(0, 32)),
            {
              token,
              platform: 'web',
              updatedAt: serverTimestamp(),
              userAgent: navigator.userAgent,
            },
            { merge: true }
          );
        }
      } catch (tokenErr) {
        console.warn('Erro ao obter token FCM (usando notificações locais):', tokenErr);
      }
    }

    return { granted: true, token };
  } catch (err: any) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return { granted: false, error: err?.message || 'Falha ao solicitar permissão.' };
  }
}

export function iniciarEscutaNotificacoes(
  onNotifRecebida?: (payload: { title: string; body: string; data?: any }) => void
) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  getFCM().then((messaging) => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Vimo Gastronomia';
      const body = payload.notification?.body || payload.data?.body || 'Nova notificação';

      // Exibe notificação nativa do sistema operacional se tiver permissão
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: payload.data,
          });
        } catch (e) {
          console.warn('Erro ao disparar Notification nativa:', e);
        }
      }

      if (onNotifRecebida) {
        onNotifRecebida({ title, body, data: payload.data });
      }
    });
  });
}

export function dispararNotificacaoLocalPush({
  titulo,
  corpo,
  icone = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  link,
}: {
  titulo: string;
  corpo: string;
  icone?: string;
  link?: string;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(titulo, {
            body: corpo,
            icon: icone,
            badge: icone,
            tag: 'vimo-gastronomia-' + Date.now(),
            data: { url: link || window.location.href },
          });
        });
      } else {
        new Notification(titulo, {
          body: corpo,
          icon: icone,
          data: { url: link || window.location.href },
        });
      }
    } catch (err) {
      console.warn('Erro ao emitir push notification:', err);
    }
  }
}
