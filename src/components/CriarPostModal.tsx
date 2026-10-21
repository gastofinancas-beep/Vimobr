import { useRef, useState } from 'react';
import { X, Camera, Image, Send } from 'lucide-react';
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
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);

  const podePubilcar = texto.trim().length > 0 || foto !== null;

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removerFoto = () => {
    setFoto(null);
    if (fotoPreview) { URL.revokeObjectURL(fotoPreview); setFotoPreview(null); }
  };

  const handlePublicar = async () => {
    if (!podePubilcar || publicando) return;
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
    } catch {
      // post salvo localmente
    } finally {
      setPublicando(false);
      onPublicado();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* inputs de arquivo ocultos */}
      <input
        ref={inputGaleriaRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFoto}
      />
      <input
        ref={inputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFoto}
      />

      {/* Cabeçalho */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-[15px] text-muted font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <span className="font-semibold text-[15px] text-ink">Nova publicação</span>
        <button
          type="button"
          onClick={handlePublicar}
          disabled={!podePubilcar || publicando}
          className="bg-primary text-white text-[14px] font-semibold px-5 py-1.5 rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {publicando ? 'Publicando…' : 'Publicar'}
        </button>
      </header>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-3 px-4 pt-4">
          <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={40} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-ink mb-2">{currentUser.displayName}</p>
            <textarea
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você comeu hoje?"
              rows={4}
              maxLength={500}
              className="w-full bg-transparent text-[16px] text-ink placeholder:text-muted resize-none focus:outline-none leading-relaxed"
            />
            {texto.length > 400 && (
              <p className={`text-right text-[12px] mt-1 ${texto.length >= 500 ? 'text-red-500' : 'text-muted'}`}>
                {500 - texto.length}
              </p>
            )}
          </div>
        </div>

        {/* Preview da foto */}
        {fotoPreview && (
          <div className="relative mx-4 mt-3 rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <img
              src={fotoPreview}
              alt=""
              className="w-full h-full object-cover"
            />
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

      {/* Toolbar de mídia */}
      <div className="border-t border-line px-4 py-3 pb-safe flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => inputGaleriaRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted"
          aria-label="Galeria"
        >
          <Image size={22} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => inputCameraRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted"
          aria-label="Câmera"
        >
          <Camera size={22} strokeWidth={1.8} />
        </button>

        {podePubilcar && (
          <button
            type="button"
            onClick={handlePublicar}
            disabled={publicando}
            className="ml-auto flex items-center gap-2 bg-primary text-white text-[14px] font-semibold px-5 py-2 rounded-full disabled:opacity-40 cursor-pointer"
          >
            <Send size={14} strokeWidth={2} />
            {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        )}
      </div>
    </div>
  );
}
