import { useRef, useState } from 'react';
import { X, Image, MapPin, Send } from 'lucide-react';
import { criarPost } from '../lib/posts';
import type { UserProfile } from '../types';
import { Avatar } from './ui';

interface CriarPostModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onPublicado: () => void;
}

export default function CriarPostModal({ currentUser, onClose, onPublicado }: CriarPostModalProps) {
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const podePubiclar = texto.trim().length > 0 || foto !== null;

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    const url = URL.createObjectURL(file);
    setFotoPreview(url);
  };

  const removerFoto = () => {
    setFoto(null);
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  };

  const handlePublicar = async () => {
    if (!podePubiclar || publicando) return;
    setPublicando(true);
    try {
      await criarPost(
        {
          uid: currentUser.uid,
          name: currentUser.displayName,
          handle: currentUser.handle,
          photo: currentUser.photoURL,
        },
        texto.trim(),
        foto ?? undefined,
      );
      onPublicado();
    } catch {
      // silencia — post ficou salvo localmente
      onPublicado();
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={20} strokeWidth={2} className="text-ink" />
        </button>
        <span className="font-semibold text-[15px] text-ink">Nova publicação</span>
        <button
          type="button"
          onClick={handlePublicar}
          disabled={!podePubiclar || publicando}
          className="flex items-center gap-1.5 bg-primary text-white text-[14px] font-semibold px-4 py-1.5 rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
        >
          <Send size={14} strokeWidth={2} />
          {publicando ? 'Publicando…' : 'Publicar'}
        </button>
      </header>

      {/* Área de composição */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-ink mb-1">{currentUser.displayName}</p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você está comendo?"
              rows={4}
              maxLength={500}
              className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted resize-none focus:outline-none leading-relaxed"
              autoFocus
            />

            {/* Preview da foto */}
            {fotoPreview && (
              <div className="relative mt-3 rounded-xl overflow-hidden aspect-square max-w-xs">
                <img src={fotoPreview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removerFoto}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center cursor-pointer"
                  aria-label="Remover foto"
                >
                  <X size={14} strokeWidth={2.5} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <footer className="border-t border-line px-4 py-3 flex items-center gap-4 pb-safe">
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFoto}
        />
        <button
          type="button"
          onClick={() => inputFotoRef.current?.click()}
          className="flex items-center gap-2 text-primary text-[14px] font-medium cursor-pointer"
          aria-label="Adicionar foto"
        >
          <Image size={20} strokeWidth={1.8} />
          <span>Foto</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 text-muted text-[14px] font-medium cursor-not-allowed opacity-50"
          aria-label="Marcar lugar (em breve)"
          disabled
        >
          <MapPin size={20} strokeWidth={1.8} />
          <span>Lugar</span>
        </button>
        {texto.length > 400 && (
          <span className={`ml-auto text-[12px] ${texto.length >= 500 ? 'text-red-500' : 'text-muted'}`}>
            {500 - texto.length}
          </span>
        )}
      </footer>
    </div>
  );
}
