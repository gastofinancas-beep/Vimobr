import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, Check, X, MapPin, Loader } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';
import { autocompleteCidade, slug } from '../lib/places';
import { Avatar } from './ui';
import type { UserProfile } from '../types';

async function comprimirImagem(file: File, max = 800): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

async function uploadFotoPerfil(uid: string, file: File): Promise<string> {
  if (!isFirebaseConfigured) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
  try {
    const blob = await comprimirImagem(file);
    const r = storageRef(storage, `avatars/${uid}/photo.jpg`);
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(r);
  } catch {
    return URL.createObjectURL(file);
  }
}

export default function EditarPerfilModal({
  usuario,
  onSalvar,
  onFechar,
}: {
  usuario: UserProfile;
  onSalvar: (user: UserProfile) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(usuario.displayName || '');
  const [handle, setHandle] = useState(usuario.handle || '');
  const [bio, setBio] = useState(usuario.bio || '');
  const [cidadeTexto, setCidadeTexto] = useState(usuario.homeCityName || '');
  const [cityKey, setCityKey] = useState(usuario.homeCityKey || '');
  const [sugestoesCidade, setSugestoesCidade] = useState<{ texto: string; cityKey: string }[]>([]);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const handleHandleChange = (val: string) => {
    let clean = val.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    if (!clean.startsWith('@')) clean = '@' + clean;
    setHandle(clean);
  };

  const handleNomeBlur = () => {
    if (!handle || handle === '@') {
      setHandle('@' + slug(nome));
    }
  };

  const handleCidadeInput = async (val: string) => {
    setCidadeTexto(val);
    if (val.length > 1) {
      const res = await autocompleteCidade(val);
      setSugestoesCidade(res);
    } else {
      setSugestoesCidade([]);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe seu nome ou apelido.');
      return;
    }
    if (handle.length < 3) {
      setErro('Escolha um @usuário com pelo menos 3 caracteres.');
      return;
    }
    setErro(null);
    setCarregando(true);

    try {
      let photoURL = usuario.photoURL;
      if (fotoFile) {
        photoURL = await uploadFotoPerfil(usuario.uid, fotoFile);
      }

      const perfil: UserProfile = {
        ...usuario,
        displayName: nome.trim(),
        handle: handle.trim(),
        bio: bio.trim(),
        photoURL,
        homeCityKey: cityKey || usuario.homeCityKey,
        homeCityName: cidadeTexto.trim() || usuario.homeCityName,
      };

      await onSalvar(perfil);
      onFechar();
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const fotoAtual = fotoPreview || usuario.photoURL;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
    >
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onFechar}
          aria-label="Cancelar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-s1 transition"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
        <h1 className="font-display text-[17px] font-bold text-ink">Editar perfil</h1>
        <button
          type="button"
          form="form-editar-perfil"
          disabled={carregando}
          className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer"
          onClick={handleSubmit}
        >
          {carregando ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
          Salvar
        </button>
      </header>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Foto de perfil */}
        <div className="flex flex-col items-center gap-3 border-b border-line py-8">
          <div className="relative">
            <Avatar
              src={fotoAtual}
              name={nome || usuario.displayName}
              size={96}
              className="text-3xl ring-4 ring-bg shadow-md"
            />
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              aria-label="Trocar foto de perfil"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-bg shadow ring-2 ring-bg hover:bg-ink/80 transition cursor-pointer"
            >
              <Camera size={15} />
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFotoChange}
            />
          </div>
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            className="text-sm font-semibold text-primary cursor-pointer"
          >
            Trocar foto
          </button>
        </div>

        {/* Formulário */}
        <form id="form-editar-perfil" onSubmit={handleSubmit} className="space-y-0">
          {erro && (
            <div role="alert" className="mx-4 mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Campo: Nome */}
          <Field label="Nome">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={handleNomeBlur}
              placeholder="Seu nome"
              maxLength={50}
              className={inputClass}
            />
          </Field>

          {/* Campo: @usuário */}
          <Field label="Nome de usuário">
            <input
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="@seunome"
              maxLength={30}
              className={inputClass}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="mt-1 text-xs text-muted px-4">Apenas letras minúsculas, números, pontos e sublinhados.</p>
          </Field>

          {/* Campo: Bio */}
          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre seu gosto gastronômico"
              maxLength={150}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-xs text-muted px-4 text-right">{bio.length}/150</p>
          </Field>

          {/* Campo: Cidade */}
          <Field label="Cidade" icon={<MapPin size={14} className="text-muted" />}>
            <div className="relative">
              <input
                value={cidadeTexto}
                onChange={(e) => handleCidadeInput(e.target.value)}
                placeholder="Sua cidade"
                className={inputClass}
              />
              {sugestoesCidade.length > 0 && (
                <div className="absolute left-4 right-4 top-full z-20 mt-1 rounded-xl border border-line bg-s2 shadow-xl overflow-hidden">
                  {sugestoesCidade.slice(0, 5).map((s) => (
                    <button
                      key={s.cityKey}
                      type="button"
                      onClick={() => {
                        setCidadeTexto(s.texto.replace(', Brasil', ''));
                        setCityKey(s.cityKey);
                        setSugestoesCidade([]);
                      }}
                      className="w-full text-left px-4 py-3 text-[13px] text-ink hover:bg-s1 transition border-b border-line last:border-0 cursor-pointer"
                    >
                      {s.texto}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-transparent px-4 py-3.5 text-[15px] text-ink placeholder:text-muted outline-none';

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      </div>
      {children}
    </div>
  );
}
