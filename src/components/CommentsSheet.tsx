import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, CornerDownRight, Share2 } from 'lucide-react';
import type { Comment, Review, UserProfile } from '../types';
import { carregarComentarios, comentar } from '../lib/reviews';
import { useEscape } from '../hooks/useEscape';

import { Mascote } from './Mascote';
export default function CommentsSheet({
  review,
  currentUser,
  onClose,
  onCommentAdded,
  onCompartilhar,
}: {
  review: Review;
  currentUser: UserProfile;
  onClose: () => void;
  onCommentAdded: () => void;
  onCompartilhar?: () => void;
}) {
  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [texto, setTexto] = useState('');
  const [respondendoA, setRespondendoA] = useState<{ id: string; handle: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [curtidasComentarios, setCurtidasComentarios] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const lista = await carregarComentarios(review.id);
      if (ativo) {
        // Mantém comentários enviados enquanto a lista ainda carregava
        setComentarios((prev) => {
          const pendentes = prev.filter(
            (c) => c.id.startsWith('tmp-') && !lista.some((l) => l.uid === c.uid && l.text === c.text)
          );
          return [...lista, ...pendentes];
        });
        setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [review.id]);

  const handleEnviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!texto.trim() || enviando) return;

    // Mostra o comentário na hora; a gravação local é imediata e o Firestore segue em segundo plano
    const textoEnvio = texto.trim();
    const pai = respondendoA?.id;
    const otimista: Comment = {
      id: 'tmp-' + Date.now(),
      uid: currentUser.uid,
      authorName: currentUser.displayName,
      authorHandle: currentUser.handle,
      authorPhoto: currentUser.photoURL,
      text: textoEnvio,
      createdAt: Date.now(),
      parentId: pai,
      likesCount: 0,
    };
    setComentarios((prev) => [...prev, otimista]);
    setTexto('');
    setRespondendoA(null);
    onCommentAdded();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    comentar(
      review.id,
      {
        uid: currentUser.uid,
        name: currentUser.displayName,
        handle: currentUser.handle,
        photo: currentUser.photoURL,
      },
      textoEnvio,
      pai
    ).catch((err) => console.error('Falha ao enviar comentário:', err));
  };

  useEscape(onClose);

  const alternarCurtidaComentario = (cid: string) => {
    setCurtidasComentarios((prev) => {
      const novo = !prev[cid];
      return { ...prev, [cid]: novo };
    });
    setComentarios((prev) =>
      prev.map((c) => {
        if (c.id === cid) {
          const ja = curtidasComentarios[cid];
          const count = (c.likesCount || 0) + (ja ? -1 : 1);
          return { ...c, likesCount: Math.max(0, count) };
        }
        return c;
      })
    );
  };

  // Organize by root comments and nested replies
  const raiz = comentarios.filter((c) => !c.parentId);
  const respostasPorPai = comentarios.reduce((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-s1 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-ink">Comentários</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-s2 text-muted font-bold">
              {comentarios.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onCompartilhar && review.uid === currentUser.uid && (
              <button
                type="button"
                onClick={onCompartilhar}
                className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-s2 transition"
                title="Compartilhar minha avaliação"
              >
                <Share2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-s2 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Lista de Comentários */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {carregando && comentarios.length === 0 ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-s2 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-3 bg-s2 rounded"></div>
                    <div className="w-3/4 h-3 bg-s2 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : comentarios.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-center gap-2">
              <Mascote reacao="curioso" tamanho={80} />
              <p className="font-semibold text-base text-ink mt-2">Nenhum comentário ainda</p>
              <p className="text-sm text-muted">Comece a conversa.</p>
            </div>
          ) : (
            raiz.map((c) => {
              const respostas = respostasPorPai[c.id] || [];
              const curtido = curtidasComentarios[c.id];
              return (
                <div key={c.id} className="space-y-3">
                  {/* Comentário Raiz */}
                  <div className="flex items-start gap-3 group">
                    <img
                      src={c.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${c.authorName}`}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 border border-line"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-ink">{c.authorName}</span>
                        <span className="text-[11px] text-muted">{c.authorHandle}</span>
                        <span className="text-[12px] text-muted/70">· {tempoFormat(c.createdAt)}</span>
                      </div>
                      <p className="text-[15px] text-ink-2 mt-0.5 leading-relaxed">{c.text}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted">
                        <button
                          onClick={() => {
                            setRespondendoA({ id: c.id, handle: c.authorHandle });
                            inputRef.current?.focus();
                          }}
                          className="hover:text-accent font-medium text-[11px] flex items-center gap-1"
                        >
                          <CornerDownRight size={12} /> Responder
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => alternarCurtidaComentario(c.id)}
                      className={`flex flex-col items-center p-1 text-[11px] transition shrink-0 ${
                        curtido ? 'text-like font-bold' : 'text-muted hover:text-ink'
                      }`}
                    >
                      <Heart size={14} className={curtido ? 'fill-like' : ''} />
                      <span>{c.likesCount || 0}</span>
                    </button>
                  </div>

                  {/* Respostas Aninhadas */}
                  {respostas.length > 0 && (
                    <div className="ml-10 space-y-3 pl-3 border-l border-line/60">
                      {respostas.map((r) => {
                        const curtidoR = curtidasComentarios[r.id];
                        return (
                          <div key={r.id} className="flex items-start gap-2.5">
                            <img
                              src={r.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${r.authorName}`}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5 border border-line"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold text-ink">{r.authorName}</span>
                                <span className="text-[11px] text-muted">{r.authorHandle}</span>
                                <span className="text-[12px] text-muted/70">· {tempoFormat(r.createdAt)}</span>
                              </div>
                              <p className="text-sm text-ink-2 mt-0.5 leading-relaxed">{r.text}</p>
                            </div>
                            <button
                              onClick={() => alternarCurtidaComentario(r.id)}
                              className={`flex flex-col items-center p-0.5 text-[12px] shrink-0 ${
                                curtidoR ? 'text-like font-bold' : 'text-muted hover:text-ink'
                              }`}
                            >
                              <Heart size={12} className={curtidoR ? 'fill-like' : ''} />
                              <span>{r.likesCount || 0}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Rodapé Fixo */}
        <div className="p-3 border-t border-line bg-s1/95 shrink-0">
          {respondendoA && (
            <div className="flex items-center justify-between pb-2 px-1 text-xs text-accent">
              <span>Respondendo a <strong>{respondendoA.handle}</strong></span>
              <button
                onClick={() => setRespondendoA(null)}
                className="text-muted hover:text-ink text-[11px]"
              >
                Cancelar
              </button>
            </div>
          )}

          <form onSubmit={handleEnviar} className="flex items-center gap-2">
            <img
              src={currentUser.photoURL}
              alt=""
              className="h-9 w-9 rounded-full object-cover shrink-0 bg-s3"
            />
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={respondendoA ? `Responder a ${respondendoA.handle}...` : 'Adicione um comentário...'}
              className="h-11 flex-1 rounded-full bg-s2 px-4 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary focus:bg-s1 transition"
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              aria-label="Enviar comentário"
              className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-hover transition shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function tempoFormat(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}
