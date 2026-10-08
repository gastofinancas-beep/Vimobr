export interface ReservaReminder {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  placePhotoUrl?: string;
  dateTime: number; // timestamp
  note?: string;
  createdAt: number;
}

const LS_RESERVAS_KEY = 'vimo_reservas_v1';

export function obterReservasUsuario(userId: string): ReservaReminder[] {
  try {
    const raw = localStorage.getItem(LS_RESERVAS_KEY);
    const all: ReservaReminder[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.userId === userId).sort((a, b) => a.dateTime - b.dateTime);
  } catch {
    return [];
  }
}

export async function criarReservaReminder(
  reminder: Omit<ReservaReminder, 'id' | 'createdAt'>
): Promise<ReservaReminder> {
  const raw = localStorage.getItem(LS_RESERVAS_KEY);
  const all: ReservaReminder[] = raw ? JSON.parse(raw) : [];

  const novo: ReservaReminder = {
    ...reminder,
    id: 'res-' + crypto.randomUUID().slice(0, 8),
    createdAt: Date.now(),
  };

  all.push(novo);
  localStorage.setItem(LS_RESERVAS_KEY, JSON.stringify(all));

  // Solicitar permissão de notificação push no navegador
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    // Test push notification if granted immediately or scheduled
    if (Notification.permission === 'granted') {
      try {
        const diffMs = reminder.dateTime - Date.now();
        if (diffMs > 0 && diffMs < 86400000 * 30) {
          // Agenda disparo simulado ou real via setTimeout se for em breve
          setTimeout(() => {
            new Notification(`Lembrete de Visita: ${reminder.placeName}`, {
              body: reminder.note || 'Chegou a hora da sua reserva! Aproveite a experiência gastronômica.',
              icon: reminder.placePhotoUrl || '/favicon.ico',
            });
          }, Math.min(diffMs, 2147483647));
        }
      } catch (err) {
        console.warn('Erro ao agendar notificação push:', err);
      }
    }
  }

  return novo;
}

export function cancelarReservaReminder(id: string): void {
  try {
    const raw = localStorage.getItem(LS_RESERVAS_KEY);
    if (!raw) return;
    const all: ReservaReminder[] = JSON.parse(raw);
    const filtered = all.filter((r) => r.id !== id);
    localStorage.setItem(LS_RESERVAS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Erro ao cancelar lembrete:', err);
  }
}
