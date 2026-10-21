import { useState } from 'react';
import { X, Camera, ImagePlus, Send } from 'lucide-react';
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

  const podePubilcar = texto.trim().length > 0 || foto !== null;

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
    // Limpa o input para permitir selecionar o mesmo arquivo de novo
    e.target.value = '';
  };

  const removerFoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      {/* Topo */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
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
          disabled={!podePubilcar || publicando}
          className="bg-primary text-white text-[14px] font-semibold px-5 py-1.5 rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {publicando ? 'Publicando…' : 'Publicar'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Área da foto — label garante que qualquer toque abre o seletor */}
        <label className="block cursor-pointer" aria-label="Selecionar foto">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFoto}
          />
          {fotoPreview ? (
            <div className="relative w-full aspect-square bg-black">
              <img
                src={fotoPreview}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Overlay: trocar / remover */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <span className="bg-black/60 text-white text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Camera size={13} strokeWidth={2} />
                  Trocar
                </span>
                <button
                  type="button"
                  onClick={removerFoto}
                  className="bg-black/60 text-white text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={13} strokeWidth={2.5} />
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square bg-s2 flex flex-col items-center justify-center gap-3 border-b border-line">
              <div className="w-16 h-16 rounded-full bg-s3 flex items-center justify-center">
                <ImagePlus size={28} strokeWidth={1.5} className="text-muted" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[15px] text-ink">Adicionar foto</p>
                <p className="text-[13px] text-muted mt-0.5">Toque para escolher ou fotografar</p>
              </div>
            </div>
          )}
        </label>

        {/* Legenda */}
        <div className="flex gap-3 px-4 pt-4 pb-6">
          <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={36} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] text-ink mb-1.5">{currentUser.displayName}</p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={foto ? 'Escreva uma legenda…' : 'Escreva algo ou adicione uma foto acima'}
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted resize-none focus:outline-none leading-relaxed"
            />
            {texto.length > 400 && (
              <p className={`text-right text-[12px] mt-1 ${texto.length >= 500 ? 'text-red-500' : 'text-muted'}`}>
                {500 - texto.length}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé: botão de envio rápido quando teclado está aberto */}
      {(texto.trim().length > 0 || foto) && (
        <div className="border-t border-line px-4 py-3 pb-safe shrink-0">
          <button
            type="button"
            onClick={handlePublicar}
            disabled={publicando}
            className="w-full bg-primary text-white font-semibold text-[15px] py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Send size={16} strokeWidth={2} />
            {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      )}
    </div>
  );
}
