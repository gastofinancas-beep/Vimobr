import React, { useState } from 'react';
import { Sparkles, MapPin, User, Check, AlertCircle } from 'lucide-react';
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
      followersCount: initialUser.followersCount || 12,
      followingCount: initialUser.followingCount || 8,
    };

    onSalvar(perfil);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--s1)] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-center text-[var(--primary)] mb-2">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">Editar Perfil</h2>
          <p className="text-[13px] text-[var(--muted)]">
            Configure seu perfil gastronômico no Vimo
          </p>
        </div>

        {erro && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-[13px] text-red-500">
            <AlertCircle size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Nome de Exibição
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Clara Mendes"
              className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* @usuário */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wider">
              @usuário (identificador único)
            </label>
            <input
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="@claramendes"
              className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 text-sm font-medium text-[var(--primary)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Cidade com Autocomplete */}
          <div className="space-y-1.5 relative">
            <label className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-[var(--star)]" />
              Sua Cidade Base
            </label>
            <input
              value={cidadeTexto}
              onChange={(e) => handleCidadeInput(e.target.value)}
              placeholder="Ex: São Paulo - SP"
              className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none"
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
            <label className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Bio Gastronômica
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte seus pratos favoritos e cafés prediletos..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-[13px] text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-12 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-medium text-sm transition flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-2xs"
          >
            <Check size={18} />
            <span>Salvar Perfil</span>
          </button>
        </form>
      </div>
    </div>
  );
}
