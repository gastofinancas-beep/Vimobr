import React, { useState } from 'react';
import { MapPin, Check, AlertCircle } from 'lucide-react';
import { autocompleteCidade, slug } from '../lib/places';
import type { UserProfile } from '../types';

export default function OnboardingModal({
  initialUser,
  onSalvar,
}: {
  initialUser: Partial<UserProfile>;
  onSalvar: (user: UserProfile) => void;
}) {
  const [nome, setNome] = useState(initialUser.displayName || 'Gourmet');
  const [handle, setHandle] = useState(
    initialUser.handle || `@${slug(initialUser.displayName || 'gourmet')}`
  );
  const [bio, setBio] = useState(
    initialUser.bio || 'Explorando os melhores sabores da cidade.'
  );
  const [cidadeTexto, setCidadeTexto] = useState(
    initialUser.homeCityName || 'São Paulo - SP'
  );
  const [cityKey, setCityKey] = useState(
    initialUser.homeCityKey || 'sao-paulo-sp'
  );
  const [sugestoesCidade, setSugestoesCidade] = useState<{ texto: string; cityKey: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const handleHandleChange = (val: string) => {
    let clean = val.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    if (!clean.startsWith('@')) clean = '@' + clean;
    setHandle(clean);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe seu nome ou apelido.');
      return;
    }
    if (handle.length < 3) {
      setErro('Escolha um @usuário com pelo menos 3 caracteres.');
      return;
    }

    const perfil: UserProfile = {
      uid: initialUser.uid || 'meu-usuario-id',
      displayName: nome.trim(),
      handle: handle.trim(),
      photoURL:
        initialUser.photoURL ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nome)}&backgroundColor=1F3163`,
      bio: bio.trim(),
      homeCityKey: cityKey,
      homeCityName: cidadeTexto,
      followersCount: initialUser.followersCount || 0,
      followingCount: initialUser.followingCount || 0,
    };

    onSalvar(perfil);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-s1 p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-1">
          <img
            src="/mascot/vimo_bem_vindo.png"
            alt=""
            aria-hidden="true"
            width={72}
            height={75}
            className="mx-auto object-contain mb-1"
          />
          <h2 className="t-title text-ink">Boas-vindas ao VIMO</h2>
          <p className="text-sm text-muted">Monte seu perfil para começar.</p>
        </div>

        {erro && (
          <div role="alert" className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-2">
              Nome
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Clara Mendes"
              className="w-full h-11 rounded-lg bg-s2 px-3.5 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition"
            />
          </div>

          {/* @usuário */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-2">
              Nome de usuário
            </label>
            <input
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="@claramendes"
              className="w-full h-11 rounded-lg bg-s2 px-3.5 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition"
            />
          </div>

          {/* Cidade com Autocomplete */}
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-ink-2 flex items-center gap-1.5">
              Cidade
            </label>
            <input
              value={cidadeTexto}
              onChange={(e) => handleCidadeInput(e.target.value)}
              placeholder="Ex: São Paulo - SP"
              className="w-full h-11 rounded-lg bg-s2 px-3.5 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition"
            />

            {sugestoesCidade.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-[var(--line)] bg-[var(--s2)] p-2 shadow-xl space-y-1 max-h-40 overflow-y-auto">
                {sugestoesCidade.map((s) => (
                  <button
                    key={s.cityKey}
                    type="button"
                    onClick={() => {
                      setCidadeTexto(s.texto.replace(', Brasil', ''));
                      setCityKey(s.cityKey);
                      setSugestoesCidade([]);
                    }}
                    className="w-full text-left p-2 rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--s1)] transition truncate block cursor-pointer"
                  >
                    {s.texto}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-2">
              Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="O que você mais gosta de comer?"
              className="w-full rounded-lg bg-s2 px-3.5 py-3 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-primary text-on-primary font-semibold text-sm transition-colors hover:bg-primary-hover flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Check size={18} />
            <span>Salvar Perfil</span>
          </button>
        </form>
      </div>
    </div>
  );
}
