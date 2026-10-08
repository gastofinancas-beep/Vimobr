import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Bell,
  X,
  ChevronDown,
} from 'lucide-react';
import { autocompleteCidade } from '../lib/places';
import type { UserProfile } from '../types';

export const CATEGORIAS_EXPLORAR = [
  'Todos',
  'Perto',
  'Melhores',
  'Cafés',
  'Hambúrguer',
  'Pizza',
  'Japonês',
  'Bares',
  'Doces',
];

interface ExplorarHeaderProps {
  currentUser: UserProfile;
  cidadeNome: string;
  onCidade: (cityKey: string, nome: string) => void;
  onAbrirPerfil: (uid: string) => void;
  onAbrirBusca: () => void;
  onAbrirNotificacoes?: () => void;
  categoriaSelecionada: string;
  onSelecionarCategoria: (cat: string) => void;
}

export default function ExplorarHeader({
  currentUser,
  cidadeNome,
  onCidade,
  onAbrirPerfil,
  onAbrirBusca,
  onAbrirNotificacoes,
  categoriaSelecionada,
  onSelecionarCategoria,
}: ExplorarHeaderProps) {
  const [modalCidadeAberta, setModalCidadeAberta] = useState(false);
  const [buscaCidade, setBuscaCidade] = useState('');
  const [sugestoes, setSugestoes] = useState<{ texto: string; cityKey: string }[]>([]);

  return (
    <header className="w-full bg-[var(--bg)] pt-4 pb-2 px-4 border-b border-[var(--line)]">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* 1. TOPO: VIMO + LOCALIZAÇÃO + NOTIFICAÇÕES + AVATAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onAbrirPerfil(currentUser.uid)}
              className="relative w-9 h-9 rounded-full overflow-hidden border border-[var(--line)] shadow-sm hover:scale-105 transition shrink-0"
              aria-label="Meu Perfil"
            >
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-full h-full object-cover"
              />
            </button>

            <div>
              <span className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                VIMO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Cidade */}
            <button
              type="button"
              onClick={() => setModalCidadeAberta(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] transition"
            >
              <MapPin size={13} className="text-[var(--accent)]" />
              <span>{cidadeNome.split(' - ')[0]}</span>
              <ChevronDown size={13} className="text-[var(--muted)]" />
            </button>

            {onAbrirNotificacoes && (
              <button
                type="button"
                onClick={onAbrirNotificacoes}
                className="w-9 h-9 rounded-lg bg-[var(--s1)] text-[var(--muted)] border border-[var(--line)] flex items-center justify-center hover:text-[var(--ink)] transition"
                aria-label="Notificações"
              >
                <Bell size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 2. BARRA DE BUSCA SIMPLES */}
        <div>
          <button
            type="button"
            onClick={onAbrirBusca}
            className="w-full h-11 px-3.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center gap-2.5 text-[var(--muted)] text-sm hover:border-[var(--accent)] transition"
          >
            <Search size={16} className="text-[var(--accent)]" />
            <span>Buscar restaurantes, cafés e bares...</span>
          </button>
        </div>

        {/* 3. CHIPS DE CATEGORIAS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          {CATEGORIAS_EXPLORAR.map((cat) => {
            const ativo = categoriaSelecionada === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelecionarCategoria(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  ativo
                    ? 'bg-[var(--ink)] text-[var(--s1)]'
                    : 'bg-[var(--s2)] text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Cidade */}
      {modalCidadeAberta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[var(--s1)] rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl border border-[var(--line)]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--ink)]">Escolher Cidade</h3>
              <button
                type="button"
                onClick={() => setModalCidadeAberta(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--s2)]"
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              value={buscaCidade}
              placeholder="Digite a cidade..."
              onChange={async (e) => {
                const val = e.target.value;
                setBuscaCidade(val);
                const res = await autocompleteCidade(val);
                setSugestoes(res);
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />

            <div className="max-h-60 overflow-y-auto space-y-1">
              {sugestoes.map((item) => (
                <button
                  key={item.cityKey}
                  type="button"
                  onClick={() => {
                    onCidade(item.cityKey, item.texto);
                    setModalCidadeAberta(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--s2)] flex items-center gap-2 transition"
                >
                  <MapPin size={14} className="text-[var(--accent)]" />
                  <span>{item.texto}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
