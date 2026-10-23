import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { carregarComentariosPost, comentarPost } from '../lib/posts';
import { idsBloqueados } from '../lib/moderacao';
import type { TweetComment, UserProfile } from '../types';
import { Avatar } from './ui';

interface ComentariosModalProps {
  postId: string;
  currentUser: UserProfile;
  onClose: () => void;
  onNovoComentario?: () => void;
}

export default function ComentariosModal({
  postId,
  currentUser,
  onClose,
  onNovoComentario,
}: ComentariosModalProps) {
  const [comentarios, setComentarios] = useState<TweetComment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarComentariosPost(postId)
      .then((lista) => {
        const bloqueados = idsBloqueados(currentUser.uid);
        setComentarios(lista.filter((c) => !bloqueados.has(c.uid)));
      })
      .catch(() => setComentarios([]))
      .finally(() => setCarregando(false));
  }, [postId]);

  const handleEnviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const novo = await comentarPost(postId, {
        uid: currentUser.uid,
        name: currentUser.displayName,
        handle: currentUser.handle,
        photo: currentUser.photoURL,
      }, t);
      setComentarios((prev) => [...prev, novo]);
      onNovoComentario?.();
      setTimeout(() => {
        listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    } catch {
      setTexto(t);
    } finally {
      setEnviando(false);
    }
  };

  const agora = Date.now();
  function tempo(ts: number) {
    const d = Math.floor((agora - ts) / 60000);
    if (d < 1) return 'agora';
    if (d < 60) return `${d}min`;
    const h = Math.floor(d / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-bg rounded-t-2xl max-h-[80vh]">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>

        {/* Título */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-line shrink-0">
          <h2 className="font-semibold text-[15px] text-ink">Comentários</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2} className="text-ink" />
          </button>
        </div>

        {/* Lista */}
        <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : comentarios.length === 0 ? (
            <p className="text-center text-muted text-[14px] py-8">Nenhum comentário ainda. Seja o primeiro.</p>
          ) : (
            comentarios.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar src={c.authorPhoto} name={c.authorName} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-[13px] text-ink">{c.authorName}</span>
                    <span className="text-[11px] text-muted">{tempo(c.createdAt)}</span>
                  </div>
                  <p className="text-[13px] text-ink-2 leading-relaxed mt-0.5">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-line px-4 py-3 pb-safe flex items-center gap-3 shrink-0">
          <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={32} />
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
            placeholder="Adicionar comentário…"
            maxLength={300}
            className="flex-1 bg-s2 rounded-full px-4 py-2 text-[14px] text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary disabled:opacity-40 transition-opacity cursor-pointer"
          >
            <Send size={16} strokeWidth={2} className="text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
