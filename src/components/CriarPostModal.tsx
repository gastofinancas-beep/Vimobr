import { useRef, useState } from 'react';
import { X, Camera, Image, Globe, Lock, Users, ChevronDown } from 'lucide-react';
import { criarPost } from '../lib/posts';
import type { FoodTweet, UserProfile } from '../types';
import { Avatar } from './ui';

type Visibilidade = NonNullable<FoodTweet['visibilidade']>;

const OPCOES_VISIBILIDADE: { value: Visibilidade; label: string; descricao: string; Icon: typeof Globe }[] = [
  { value: 'publico', label: 'Público', descricao: 'Visível para todos', Icon: Globe },
  { value: 'amigos', label: 'Melhores amigos', descricao: 'Só quem você segue de volta', Icon: Users },
  { value: 'privado', label: 'Só eu', descricao: 'Somente você pode ver', Icon: Lock },
];

interface CriarPostModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onPublicado: () => void;
}

export default function CriarPostModal({ currentUser, onClose, onPublicado }: CriarPostModalProps) {
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('publico');
  const [mostrarVisibilidade, setMostrarVisibilidade] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);

  const podePubilcar = texto.trim().length > 0 || fotos.length > 0;
  const MAX_FOTOS = 5;

  const opcaoAtual = OPCOES_VISIBILIDADE.find((o) => o.value === visibilidade)!;

  const adicionarFotos = (arquivos: FileList | null) => {
    if (!arquivos) return;
    const novos = Array.from(arquivos).slice(0, MAX_FOTOS - fotos.length);
    if (novos.length === 0) return;
    setFotos((prev) => [...prev, ...novos]);
    setPreviews((prev) => [...prev, ...novos.map((f) => URL.createObjectURL(f))]);
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
        undefined,
        undefined,
        undefined,
        visibilidade,
      );
    } catch {
      // post salvo localmente
    } finally {
      setPublicando(false);
      onPublicado();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        {/* inputs ocultos */}
        <input ref={inputGaleriaRef} type="file" accept="image/*" multiple className="sr-only"
          onChange={(e) => adicionarFotos(e.target.files)} />
        <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => adicionarFotos(e.target.files)} />

        {/* Cabeçalho */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
          <button type="button" onClick={onClose} className="text-[15px] text-muted font-medium cursor-pointer">
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
          {/* Autor + texto */}
          <div className="flex gap-3 px-4 pt-4 pb-3">
            <div className="flex flex-col items-center gap-1">
              <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={42} />
              {fotos.length > 0 && <div className="w-px flex-1 bg-line min-h-[16px]" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-semibold text-[14px] text-ink leading-tight">{currentUser.displayName}</p>
              <textarea
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="O que você comeu hoje?"
                rows={fotos.length > 0 ? 2 : 5}
                maxLength={500}
                className="w-full bg-transparent text-[16px] text-ink placeholder:text-muted resize-none focus:outline-none leading-relaxed mt-1.5"
              />
              {texto.length > 400 && (
                <p className={`text-right text-[12px] mt-0.5 ${texto.length >= 500 ? 'text-red-500' : 'text-muted'}`}>
                  {500 - texto.length}
                </p>
              )}
            </div>
          </div>

          {/* Grid de fotos */}
          {previews.length > 0 && (
            <div className={`px-4 pb-4 grid gap-1.5 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {previews.map((src, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-xl overflow-hidden bg-s2 ${
                    previews.length === 1 ? 'aspect-[4/3]' :
                    previews.length === 3 && idx === 0 ? 'row-span-2 aspect-square' :
                    'aspect-square'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removerFoto(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center cursor-pointer"
                    aria-label="Remover foto"
                  >
                    <X size={13} strokeWidth={2.5} className="text-white" />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  onClick={() => inputGaleriaRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-line flex items-center justify-center cursor-pointer hover:bg-s2 transition-colors"
                  aria-label="Adicionar mais fotos"
                >
                  <Image size={20} strokeWidth={1.5} className="text-muted" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-line shrink-0">
          {/* Toolbar de mídia */}
          <div className="flex items-center px-3 py-2 gap-0.5">
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              disabled={fotos.length >= MAX_FOTOS}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
              aria-label="Galeria"
            >
              <Image size={21} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => inputCameraRef.current?.click()}
              disabled={fotos.length >= MAX_FOTOS}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
              aria-label="Câmera"
            >
              <Camera size={21} strokeWidth={1.8} />
            </button>
            {fotos.length > 0 && (
              <span className="text-[12px] text-muted ml-0.5">{fotos.length}/{MAX_FOTOS}</span>
            )}
          </div>

          {/* Seletor de visibilidade */}
          <div className="px-4 pb-safe pb-3">
            <button
              type="button"
              onClick={() => setMostrarVisibilidade(true)}
              className="flex items-center gap-2 text-[13px] text-muted cursor-pointer"
            >
              <opcaoAtual.Icon size={14} strokeWidth={2} />
              <span className="font-medium">{opcaoAtual.label}</span>
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Sheet de visibilidade */}
      {mostrarVisibilidade && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setMostrarVisibilidade(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-bg rounded-t-2xl pb-safe">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-line" />
            </div>
            <h2 className="font-semibold text-[15px] text-ink px-5 pb-3 pt-1">Quem pode ver?</h2>
            <div className="divide-y divide-line">
              {OPCOES_VISIBILIDADE.map(({ value, label, descricao, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setVisibilidade(value); setMostrarVisibilidade(false); }}
                  className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-s2 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    value === 'publico' ? 'bg-blue-100 text-primary' :
                    value === 'amigos' ? 'bg-green-100 text-green-600' :
                    'bg-s3 text-muted'
                  }`}>
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-ink">{label}</p>
                    <p className="text-[12px] text-muted mt-0.5">{descricao}</p>
                  </div>
                  {visibilidade === value && (
                    <div className="w-5 h-5 rounded-full border-[6px] border-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  );
}
