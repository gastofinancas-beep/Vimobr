import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Heart,
  MessageCircle,
  Users,
  UserPlus,
  CheckCheck,
  Trash2,
  BookOpen,
  UserCheck,
  Sparkles,
  MapPin,
  Check,
  Smartphone,
  Send,
  Loader2,
} from 'lucide-react';
import {
  obterNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  removerNotificacao,
  responderNotificacaoMarcacao,
  criarNotificacao,
} from '../lib/notifications';
import { solicitarPermissaoNotificacoes, dispararNotificacaoLocalPush } from '../lib/fcm';
import type { NotificationItem, NotificationType, CompanionStatus } from '../types';
import { Avatar } from './ui';
import { useEscape } from '../hooks/useEscape';

function tempoAtras(timestamp: number): string {
  const seg = Math.floor((Date.now() - timestamp) / 1000);
  if (seg < 60) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'ontem' : `${d} dias`;
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

export default function NotificationsModal({
  currentUserUid,
  onClose,
  onAbrirLugar,
  onAbrirPerfil,
}: {
  currentUserUid: string;
  onClose: () => void;
  onAbrirLugar?: (placeId: string) => void;
  onAbrirPerfil?: (uid: string) => void;
}) {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  useEscape(onClose);
  const [filtro, setFiltro] = useState<'todas' | NotificationType>('todas');
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [ativandoPush, setAtivandoPush] = useState(false);

  const carregar = () => {
    setNotifs(obterNotificacoes(currentUserUid));
  };

  useEffect(() => {
    carregar();
    const handleUpdate = () => carregar();
    window.addEventListener('garfo:notifications_updated', handleUpdate);
    return () => window.removeEventListener('garfo:notifications_updated', handleUpdate);
  }, [currentUserUid]);

  const handleAtivarPush = async () => {
    setAtivandoPush(true);
    const res = await solicitarPermissaoNotificacoes(currentUserUid);
    setAtivandoPush(false);
    if (res.granted) {
      setPushStatus('granted');
      dispararNotificacaoLocalPush({
        titulo: 'Notificações Push Ativadas! 🔔',
        corpo: 'Você agora receberá alertas instantâneos quando amigos curtirem ou comentarem em suas avaliações.',
      });
    } else {
      setPushStatus(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');
    }
  };

  const handleTestarPush = () => {
    criarNotificacao(currentUserUid, {
      tipo: 'curtida',
      remetente: {
        uid: 'user-camila',
        name: 'Camila Duarte',
        handle: '@camilagourmet',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
      placeId: 'chIJf-place-01',
      placeName: 'Maniçoba Bistrô & Café',
      texto: 'curtiu sua avaliação sobre o Maniçoba Bistrô & Café!',
    });
    carregar();
  };

  const filtradas = notifs.filter((n) => {
    if (filtro === 'todas') return true;
    return n.tipo === filtro;
  });

  const naoLidas = notifs.filter((n) => !n.lida).length;

  const handleMarcarLida = (n: NotificationItem) => {
    if (!n.lida) {
      marcarComoLida(currentUserUid, n.id);
      carregar();
    }
    if (n.placeId && onAbrirLugar) {
      onAbrirLugar(n.placeId);
      onClose();
    } else if (n.remetente.uid && onAbrirPerfil && n.tipo === 'seguir') {
      onAbrirPerfil(n.remetente.uid);
      onClose();
    }
  };

  const handleResponderMarcacao = (
    notif: NotificationItem,
    resposta: CompanionStatus,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!notif.reviewId) return;
    responderNotificacaoMarcacao(currentUserUid, notif.id, notif.reviewId, resposta);
    carregar();
  };

  const ICONE: Record<NotificationType, { Icon: typeof Heart; cor: string }> = {
    curtida: { Icon: Heart, cor: 'bg-star text-white' },
    comentario: { Icon: MessageCircle, cor: 'bg-primary text-on-primary' },
    marcacao_presenca: { Icon: Users, cor: 'bg-primary text-on-primary' },
    seguir: { Icon: UserPlus, cor: 'bg-success text-white' },
  } as Record<NotificationType, { Icon: typeof Heart; cor: string }>;

  const filtros: { key: 'todas' | NotificationType; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'curtida', label: 'Curtidas' },
    { key: 'comentario', label: 'Comentários' },
    { key: 'marcacao_presenca', label: 'Marcações' },
  ];

  const botaoResposta =
    'h-8 rounded-full px-3 text-sm font-semibold transition-colors cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-notificacoes"
        className="w-full sm:max-w-lg h-[88dvh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-s3 sm:hidden" />

        {/* Cabeçalho */}
        <div className="shrink-0 px-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="titulo-notificacoes" className="t-title text-ink whitespace-nowrap">Notificações</h2>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    marcarTodasComoLidas(currentUserUid);
                    carregar();
                  }}
                  className="h-9 whitespace-nowrap rounded-full px-3 text-sm font-medium text-primary hover:bg-s2 transition-colors cursor-pointer"
                >
                  Marcar {naoLidas} como lidas
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-s2 hover:text-ink transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Push: uma linha discreta, só enquanto não estiver ativo */}
          {pushStatus !== 'granted' && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-s2 px-3 py-2.5">
              <p className="min-w-0 text-sm text-ink-2">Receba um aviso quando alguém interagir com você.</p>
              <button
                type="button"
                onClick={handleAtivarPush}
                disabled={ativandoPush}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-on-primary disabled:opacity-60 cursor-pointer"
              >
                {ativandoPush && <Loader2 size={14} className="animate-spin" />}
                Ativar
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="mt-3 flex gap-5 overflow-x-auto no-scrollbar border-b border-line">
            {filtros.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                aria-pressed={filtro === f.key}
                className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm transition-colors cursor-pointer ${
                  filtro === f.key ? 'border-primary font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4">
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <img src="/mascot/vimo_dormindo.png" alt="" aria-hidden="true" width={72} height={75} className="object-contain" />
              <p className="mt-4 text-base font-semibold text-ink">Tudo calmo por aqui</p>
              <p className="mt-1 max-w-[240px] text-sm text-muted">Curtidas, comentários e marcações aparecem aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtradas.map((n) => {
                const tipo = ICONE[n.tipo] || ICONE.curtida;
                const pendente =
                  n.tipo === 'marcacao_presenca' && (!n.companionStatus || n.companionStatus === 'pendente');
                return (
                  <li
                    key={n.id}
                    onClick={() => handleMarcarLida(n)}
                    className="group relative flex cursor-pointer gap-3 py-3.5"
                  >
                    <div className="relative shrink-0">
                      <Avatar src={n.remetente.photo} name={n.remetente.name} size={40} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-s1 ${tipo.cor}`}
                      >
                        <tipo.Icon size={10} strokeWidth={2.4} className={n.tipo === 'curtida' ? 'fill-current' : ''} />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm text-ink-2">
                        <span className="font-semibold text-ink">{n.remetente.name}</span> {n.texto}
                      </p>
                      <p className="mt-0.5 t-meta">
                        {n.placeName ? `${n.placeName} · ` : ''}
                        {tempoAtras(n.createdAt)}
                      </p>

                      {pendente && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleResponderMarcacao(n, 'aprovado_coautor', e)}
                            className={`${botaoResposta} bg-primary text-on-primary`}
                          >
                            Coautor
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleResponderMarcacao(n, 'aprovado_presenca', e)}
                            className={`${botaoResposta} bg-s2 text-ink hover:bg-s3`}
                          >
                            Só presença
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleResponderMarcacao(n, 'recusado', e)}
                            className={`${botaoResposta} text-muted hover:text-ink`}
                          >
                            Recusar
                          </button>
                        </div>
                      )}
                    </div>

                    {!n.lida && (
                      <span aria-label="Não lida" className="absolute right-0 top-5 h-2 w-2 rounded-full bg-primary" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removerNotificacao(currentUserUid, n.id);
                        carregar();
                      }}
                      aria-label="Excluir notificação"
                      className="absolute bottom-3 right-0 p-1 text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
