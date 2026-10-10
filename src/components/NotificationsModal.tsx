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
import { Avatar, PlaceImage, chip } from './ui';
import { SAMPLE_PLACES } from '../lib/places';
import { seguir, idsSeguindo } from '../lib/reviews';
import { useEscape } from '../hooks/useEscape';

import { Mascote } from './Mascote';
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
  const [pushDispensado, setPushDispensado] = useState(() => {
    try {
      return localStorage.getItem('vimo_push_dispensado') === '1';
    } catch {
      return false;
    }
  });
  const [seguindo, setSeguindo] = useState<Set<string>>(new Set());
  useEffect(() => {
    idsSeguindo(currentUserUid).then((ids) => setSeguindo(new Set(ids))).catch(() => {});
  }, [currentUserUid]);

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
        titulo: 'Notificações ativadas',
        corpo: 'Você vai receber um aviso quando alguém curtir, comentar ou marcar você.',
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
      texto: 'curtiu sua avaliação de Maniçoba Bistrô & Café.',
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
    curtida: { Icon: Heart, cor: 'bg-like text-white' },
    comentario: { Icon: MessageCircle, cor: 'bg-ink text-bg' },
    marcacao_presenca: { Icon: Users, cor: 'bg-primary text-white' },
    seguir: { Icon: UserPlus, cor: 'bg-primary text-white' },
  };

  const filtros: { key: 'todas' | NotificationType; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'curtida', label: 'Curtidas' },
    { key: 'comentario', label: 'Comentários' },
    { key: 'marcacao_presenca', label: 'Marcações' },
    { key: 'seguir', label: 'Seguidores' },
  ];

  // Agrupa por período, como nos apps sociais
  const agora = Date.now();
  const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
  const grupos = [
    { titulo: 'Hoje', itens: filtradas.filter((n) => n.createdAt >= inicioHoje.getTime()) },
    { titulo: 'Esta semana', itens: filtradas.filter((n) => n.createdAt < inicioHoje.getTime() && agora - n.createdAt < 7 * 864e5) },
    { titulo: 'Antes', itens: filtradas.filter((n) => agora - n.createdAt >= 7 * 864e5) },
  ].filter((g) => g.itens.length > 0);

  const fotoDoLugar = (placeId?: string) => SAMPLE_PLACES.find((p) => p.id === placeId)?.photoUrl;

  const seguirDeVolta = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSeguindo((s) => new Set(s).add(uid));
    seguir(currentUserUid, uid).catch(() => {});
  };

  const dispensarPush = () => {
    setPushDispensado(true);
    try {
      localStorage.setItem('vimo_push_dispensado', '1');
    } catch {}
  };

  const botaoResposta = 'h-8 rounded-full px-3.5 text-sm font-semibold transition-colors cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-notificacoes"
        className="w-full sm:max-w-lg h-[90dvh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-bg flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-s3 sm:hidden" />

        {/* Cabeçalho */}
        <div className="shrink-0 px-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="titulo-notificacoes" className="font-display text-[22px] font-bold tracking-tight text-ink">
              Notificações
            </h2>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    marcarTodasComoLidas(currentUserUid);
                    carregar();
                  }}
                  aria-label="Marcar todas como lidas"
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-primary hover:bg-s2 transition-colors cursor-pointer"
                >
                  <CheckCheck size={16} strokeWidth={2} />
                  Ler todas
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

          {/* Filtros em pílula, como em Amigos */}
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
            {filtros.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                aria-pressed={filtro === f.key}
                className={chip(filtro === f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {/* Aviso de push: uma linha, pode ser dispensado */}
          {pushStatus === 'default' && !pushDispensado && (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-s1 p-3.5 shadow-sm dark:shadow-none dark:ring-1 dark:ring-line">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell size={18} strokeWidth={2} />
              </span>
              <p className="min-w-0 flex-1 text-sm text-ink-2">Receba um aviso quando alguém interagir com você.</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={handleAtivarPush}
                  disabled={ativandoPush}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                >
                  {ativandoPush && <Loader2 size={14} className="animate-spin" />}
                  Ativar
                </button>
                <button type="button" onClick={dispensarPush} className="text-xs font-medium text-muted hover:text-ink cursor-pointer">
                  Agora não
                </button>
              </div>
            </div>
          )}

          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <Mascote reacao="tranquilo" tamanho={88} />
              <p className="mt-4 text-lg font-semibold tracking-tight text-ink">
                {filtro === 'todas' ? 'Tudo calmo por aqui' : 'Nada neste filtro'}
              </p>
              <p className="mt-1 max-w-[260px] text-sm text-muted">
                Curtidas, comentários, marcações e novos seguidores aparecem aqui.
              </p>
            </div>
          ) : (
            grupos.map((g) => (
              <section key={g.titulo} className="pb-2">
                <h3 className="px-4 pb-1 pt-2 text-sm font-semibold text-ink">{g.titulo}</h3>
                <ul>
                  {g.itens.map((n) => {
                    const tipo = ICONE[n.tipo] || ICONE.curtida;
                    const pendente =
                      n.tipo === 'marcacao_presenca' && (!n.companionStatus || n.companionStatus === 'pendente');
                    const foto = fotoDoLugar(n.placeId);
                    return (
                      <li
                        key={n.id}
                        onClick={() => handleMarcarLida(n)}
                        className={`group relative flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-s2/60 ${
                          n.lida ? '' : 'bg-primary/[0.06]'
                        }`}
                      >
                        {!n.lida && <span className="sr-only">Não lida</span>}
                        <div className="relative h-11 w-11 shrink-0">
                          <Avatar src={n.remetente.photo} name={n.remetente.name} size={44} />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-bg ${tipo.cor}`}
                          >
                            <tipo.Icon size={11} strokeWidth={2.4} className={n.tipo === 'curtida' ? 'fill-current' : ''} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-ink-2">
                            <span className="font-semibold text-ink">{n.remetente.name}</span> {n.texto}{' '}
                            <span className="whitespace-nowrap text-muted">{tempoAtras(n.createdAt)}</span>
                          </p>

                          {pendente && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleResponderMarcacao(n, 'aprovado_coautor', e)}
                                className={`${botaoResposta} bg-ink text-bg`}
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

                        {/* À direita: seguir de volta ou miniatura do lugar */}
                        {n.tipo === 'seguir' ? (
                          seguindo.has(n.remetente.uid) ? (
                            <span className="h-8 shrink-0 self-center rounded-full bg-s2 px-3.5 text-sm font-semibold leading-8 text-muted">
                              Seguindo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => seguirDeVolta(n.remetente.uid, e)}
                              className="h-8 shrink-0 self-center rounded-full bg-primary px-3.5 text-sm font-semibold text-white cursor-pointer"
                            >
                              Seguir
                            </button>
                          )
                        ) : (
                          n.placeId && (
                            <PlaceImage src={foto} name={n.placeName} className="h-12 w-12 shrink-0 self-center rounded-xl" />
                          )
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerNotificacao(currentUserUid, n.id);
                            carregar();
                          }}
                          aria-label="Excluir notificação"
                          className="absolute right-1 top-1 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover:opacity-100 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
