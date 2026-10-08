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

function tempoAtras(timestamp: number): string {
  const seg = Math.floor((Date.now() - timestamp) / 1000);
  if (seg < 60) return 'agora mesmo';
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
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

  const renderIconeTipo = (tipo: NotificationType) => {
    switch (tipo) {
      case 'curtida':
        return (
          <div className="h-4 w-4 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30">
            <Heart size={10} className="fill-red-500" />
          </div>
        );
      case 'comentario':
        return (
          <div className="h-4 w-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
            <MessageCircle size={10} className="fill-blue-500" />
          </div>
        );
      case 'marcacao_presenca':
        return (
          <div className="h-4 w-4 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
            <Users size={10} />
          </div>
        );
      case 'seguir':
        return (
          <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
            <UserPlus size={10} />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-2xl sm:rounded-2xl border border-[var(--line)] bg-[var(--bg)] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--s1)] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-[var(--s2)] text-[var(--star)] flex items-center justify-center shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base text-[var(--ink)]">Notificações</h2>
                  {naoLidas > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[12px] font-medium bg-[var(--star)] text-white">
                      {naoLidas} {naoLidas === 1 ? 'nova' : 'novas'}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--muted)]">
                  Alertas em tempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    marcarTodasComoLidas(currentUserUid);
                    carregar();
                  }}
                  className="min-h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--s2)] text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1.5 transition cursor-pointer"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={15} className="text-[var(--primary)]" />
                  <span>Lidas</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Banner de Push Notification */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--s1)] text-[var(--primary)] flex items-center justify-center shrink-0">
                <Smartphone size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[var(--ink)]">Notificações Push</span>
                  {pushStatus === 'granted' ? (
                    <span className="text-[12px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-medium">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[12px] px-1.5 py-0.5 rounded bg-[var(--s1)] text-[var(--muted)]">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--muted)] truncate">
                  {pushStatus === 'granted'
                    ? 'Recebendo alertas instantâneos'
                    : 'Receba alertas quando amigos interagirem'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {pushStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={handleAtivarPush}
                  disabled={ativandoPush}
                  className="min-h-11 px-3.5 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-medium text-[12px] hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                >
                  {ativandoPush ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                  <span>Ativar</span>
                </button>
              )}
            </div>
          </div>

          {/* Abas de Filtro */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setFiltro('todas')}
              className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium transition shrink-0 cursor-pointer ${
                filtro === 'todas'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              Todas ({notifs.length})
            </button>
            <button
              onClick={() => setFiltro('curtida')}
              className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filtro === 'curtida'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              <Heart size={13} />
              <span>Curtidas</span>
            </button>
            <button
              onClick={() => setFiltro('comentario')}
              className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filtro === 'comentario'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              <MessageCircle size={13} />
              <span>Comentários</span>
            </button>
            <button
              onClick={() => setFiltro('marcacao_presenca')}
              className={`min-h-11 px-3.5 rounded-xl text-[13px] font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filtro === 'marcacao_presenca'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              <Users size={13} />
              <span>Marcações</span>
            </button>
          </div>
        </div>

        {/* Lista de Notificações */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {filtradas.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-[var(--s2)] flex items-center justify-center text-[var(--muted)]">
                <Bell size={22} />
              </div>
              <div>
                <p className="font-medium text-sm text-[var(--ink)]">Nenhuma notificação</p>
                <p className="text-[12px] text-[var(--muted)] mt-0.5">
                  Interações, curtidas e comentários nas suas visitas aparecerão aqui.
                </p>
              </div>
            </div>
          ) : (
            filtradas.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarcarLida(n)}
                className={`p-3 rounded-xl border transition cursor-pointer relative group flex gap-3 ${
                  !n.lida
                    ? 'border-[var(--primary)]/40 bg-[var(--s1)]'
                    : 'border-[var(--line)] bg-[var(--s1)] hover:border-[var(--primary)]/30'
                }`}
              >
                {/* Indicador de não lida */}
                {!n.lida && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[var(--star)]" />
                )}

                {/* Avatar com badge do tipo */}
                <div className="relative shrink-0">
                  <img
                    src={n.remetente.photo}
                    alt={n.remetente.name}
                    className="h-10 w-10 rounded-full object-cover border border-[var(--line)]"
                  />
                  <div className="absolute -bottom-1 -right-1">
                    {renderIconeTipo(n.tipo)}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[13px] text-[var(--ink)] leading-relaxed">
                    <strong className="font-medium">{n.remetente.name}</strong>{' '}
                    <span className="text-[var(--muted)]">{n.texto}</span>
                  </p>

                  {/* Informações adicionais de lugar se houver */}
                  {n.placeName && (
                    <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[var(--star)]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{n.placeName}</span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[12px] text-[var(--muted)]">
                    <span>{tempoAtras(n.createdAt)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removerNotificacao(currentUserUid, n.id);
                        carregar();
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition p-1 cursor-pointer"
                      title="Excluir notificação"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
