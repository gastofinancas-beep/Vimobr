import { useState } from 'react';
import { criarClube } from '../lib/clubes';
import type { Clube, UserProfile } from '../types';
import { inputClass } from './ui';

export default function CriarClubeModal({
  currentUser,
  onClose,
  onCriado,
}: {
  currentUser: UserProfile;
  onClose: () => void;
  onCriado: (clube: Clube) => void;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cidade, setCidade] = useState(currentUser.homeCityName ?? '');
  const [salvando, setSalvando] = useState(false);

  const podeCriar = nome.trim().length >= 3 && !salvando;

  const handleCriar = async () => {
    if (!podeCriar) return;
    setSalvando(true);
    const clube = await criarClube(
      {
        uid: currentUser.uid,
        name: currentUser.displayName,
        handle: currentUser.handle,
        photo: currentUser.photoURL ?? '',
      },
      { nome, descricao, cidade },
    );
    onCriado(clube);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
        <button type="button" onClick={onClose} className="text-[15px] text-muted font-medium cursor-pointer">
          Cancelar
        </button>
        <span className="font-semibold text-[15px] text-ink">Novo clube</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-5">
        <div className="flex items-center gap-4">
          <EscudoClube nome={nome || 'Clube'} tamanho={64} />
          <p className="text-sm text-muted leading-snug">
            Junte amigos, registrem as idas e disputem o ranking do mês com outros clubes.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Nome</span>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={40}
            placeholder="Ex.: Cafés do Centro"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Descrição</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Do que o clube gosta e como vocês se organizam"
            className={`${inputClass} h-auto py-3 resize-none`}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Cidade</span>
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            maxLength={40}
            placeholder="Opcional"
            className={inputClass}
          />
        </label>
      </div>

      <div className="px-4 pt-2 pb-4 pb-safe shrink-0">
        <button
          type="button"
          onClick={handleCriar}
          disabled={!podeCriar}
          className="w-full h-12 bg-primary text-white text-[15px] font-semibold rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {salvando ? 'Criando…' : 'Criar clube'}
        </button>
      </div>
    </div>
  );
}

/** Escudo do clube: iniciais do nome sobre o azul da marca. */
export function EscudoClube({ nome, tamanho = 48, className = '' }: { nome: string; tamanho?: number; className?: string }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || nome.trim().charAt(0).toUpperCase() || 'C';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-primary font-display font-extrabold text-white ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }}
      aria-hidden="true"
    >
      {iniciais}
    </span>
  );
}
