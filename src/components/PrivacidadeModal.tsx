import React, { useState } from 'react';
import { X, Lock, Globe, MessageSquare, Shield, Check } from 'lucide-react';
import type { UserProfile } from '../types';

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  commentPermission: 'everyone' | 'followers' | 'none';
}

const LS_PRIVACY_KEY = 'vimo_privacy_settings_v1';

export function obterConfiguracoesPrivacidade(userId: string): PrivacySettings {
  try {
    const raw = localStorage.getItem(`${LS_PRIVACY_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    profileVisibility: 'public',
    commentPermission: 'everyone',
  };
}

export function salvarConfiguracoesPrivacidade(userId: string, settings: PrivacySettings) {
  try {
    localStorage.setItem(`${LS_PRIVACY_KEY}_${userId}`, JSON.stringify(settings));
  } catch {}
}

export default function PrivacidadeModal({
  currentUser,
  onClose,
  onSalvo,
}: {
  currentUser: UserProfile;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [settings, setSettings] = useState<PrivacySettings>(() => obterConfiguracoesPrivacidade(currentUser.uid));
  const [salvando, setSalvando] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    salvarConfiguracoesPrivacidade(currentUser.uid, settings);
    setTimeout(() => {
      setSalvando(false);
      onSalvo();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line bg-s1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Configurações de Privacidade</h3>
              <p className="text-xs text-muted">Gerencie a visibilidade e interações do seu perfil</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Visibilidade do Perfil */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Lock size={14} className="text-accent" />
              Visibilidade da Conta
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, profileVisibility: 'public' })}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                  settings.profileVisibility === 'public'
                    ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                    : 'border-line bg-bg text-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={16} className={settings.profileVisibility === 'public' ? 'text-accent' : ''} />
                  <span className="font-bold text-xs">Público</span>
                </div>
                <p className="text-[11px] leading-snug opacity-80">Qualquer membro pode ver seus diários e reviews.</p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, profileVisibility: 'private' })}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                  settings.profileVisibility === 'private'
                    ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                    : 'border-line bg-bg text-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={16} className={settings.profileVisibility === 'private' ? 'text-accent' : ''} />
                  <span className="font-bold text-xs">Privado</span>
                </div>
                <p className="text-[11px] leading-snug opacity-80">Apenas seus seguidores aprovados veem seu diário.</p>
              </button>
            </div>
          </div>

          {/* Quem pode comentar */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <MessageSquare size={14} className="text-accent" />
              Quem pode comentar nas suas postagens
            </label>

            <div className="space-y-2">
              {[
                { id: 'everyone', label: 'Todos os usuários', desc: 'Qualquer pessoa na comunidade pode comentar.' },
                { id: 'followers', label: 'Apenas seguidores', desc: 'Somente pessoas que te seguem podem deixar comentários.' },
                { id: 'none', label: 'Ninguém (Desativado)', desc: 'Comentários desativados em todas as suas reviews.' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, commentPermission: opt.id as any })}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                    settings.commentPermission === opt.id
                      ? 'border-accent bg-accent/10 text-ink'
                      : 'border-line bg-bg text-muted hover:text-ink'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs text-ink">{opt.label}</p>
                    <p className="text-[11px] text-muted">{opt.desc}</p>
                  </div>
                  {settings.commentPermission === opt.id && (
                    <div className="h-5 w-5 rounded-full bg-accent text-bg flex items-center justify-center shrink-0">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="h-12 w-full rounded-full bg-accent text-bg font-bold text-xs shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {salvando ? 'Salvando...' : 'Salvar Configurações de Privacidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
