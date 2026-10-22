import { useRef, useState } from 'react';
import { X, Camera, Image } from 'lucide-react';
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
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [publicando, setPublicando] = useState(false);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);

  const podePubilcar = texto.trim().length > 0 || fotos.length > 0;
  const MAX_FOTOS = 5;

  const adicionarFotos = (arquivos: FileList | null) => {
    if (!arquivos) return;
    const novos = Array.from(arquivos).slice(0, MAX_FOTOS - fotos.length);
    if (novos.length === 0) return;
    const novosPreviews = novos.map((f) => URL.createObjectURL(f));
    setFotos((prev) => [...prev, ...novos]);
    setPreviews((prev) => [...prev, ...novosPreviews]);
  };

  const removerFoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setFotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
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
        fotos.length > 0 ? fotos : undefined,
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
        multiple
        className="sr-only"
        onChange={(e) => adicionarFotos(e.target.files)}
      />
      <input
        ref={inputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => adicionarFotos(e.target.files)}
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

        {/* Preview das fotos */}
        {previews.length > 0 && (
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
            {previews.map((src, idx) => (
              <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-s2">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer"
                  aria-label="Remover foto"
                >
                  <X size={11} strokeWidth={2.5} className="text-white" />
                </button>
                {idx === 0 && previews.length > 1 && (
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    capa
                  </span>
                )}
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => inputGaleriaRef.current?.click()}
                className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-line flex items-center justify-center cursor-pointer hover:bg-s2 transition-colors"
                aria-label="Adicionar mais fotos"
              >
                <Image size={22} strokeWidth={1.5} className="text-muted" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toolbar de mídia */}
      <div className="border-t border-line px-4 py-3 pb-safe flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => inputGaleriaRef.current?.click()}
          disabled={fotos.length >= MAX_FOTOS}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
          aria-label="Galeria"
        >
          <Image size={22} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => inputCameraRef.current?.click()}
          disabled={fotos.length >= MAX_FOTOS}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
          aria-label="Câmera"
        >
          <Camera size={22} strokeWidth={1.8} />
        </button>
        {fotos.length > 0 && (
          <span className="text-[13px] text-muted ml-1">{fotos.length}/{MAX_FOTOS}</span>
        )}
      </div>
    </div>
  );
}
