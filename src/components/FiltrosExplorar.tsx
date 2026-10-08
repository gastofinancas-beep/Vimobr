import React, { useState } from 'react';
import { Filter, Clock, MapPin, DollarSign, RotateCcw, Check, ChevronDown } from 'lucide-react';

export interface FiltrosState {
  faixaPreco: string | null;
  bairro: string | null;
  abertoAgora: boolean;
}

export const FILTROS_INICIAIS: FiltrosState = {
  faixaPreco: null,
  bairro: null,
  abertoAgora: false,
};

const BAIRROS_POPULARES = [
  'Pinheiros',
  'Vila Madalena',
  'Jardins',
  'Itaim Bibi',
  'Bela Vista',
  'Moema',
  'Lapa',
  'Centro',
];

const PRECOS_OPCOES = [
  { id: '$', label: '$ (Econômico)' },
  { id: '$$', label: '$$ (Moderado)' },
  { id: '$$$', label: '$$$ (Sofisticado)' },
  { id: '$$$$', label: '$$$$ (Alta Gastronomia)' },
];

export default function FiltrosExplorar({
  filtros,
  onAlterarFiltros,
}: {
  filtros: FiltrosState;
  onAlterarFiltros: (novos: FiltrosState) => void;
  totalResultados?: number;
}) {
  const [menuAberto, setMenuAberto] = useState<'preco' | 'bairro' | null>(null);

  const filtrosAtivos = [
    filtros.faixaPreco ? 1 : 0,
    filtros.bairro ? 1 : 0,
    filtros.abertoAgora ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const limparTudo = () => {
    onAlterarFiltros(FILTROS_INICIAIS);
    setMenuAberto(null);
  };

  return (
    <div className="px-4 py-2 bg-transparent sticky top-[57px] z-20">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Indicador de Filtros Ativos / Botão Limpar */}
        {filtrosAtivos > 0 ? (
          <button
            type="button"
            onClick={limparTudo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs hover:bg-amber-600 shrink-0 transition active:scale-95"
          >
            <RotateCcw size={12} className="stroke-[2.5]" />
            <span>Limpar ({filtrosAtivos})</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 text-xs font-medium shrink-0">
            <Filter size={13} className="text-amber-500" />
            <span>Filtros</span>
          </div>
        )}

        {/* Toggle: Aberto Agora */}
        <button
          type="button"
          onClick={() => onAlterarFiltros({ ...filtros, abertoAgora: !filtros.abertoAgora })}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition shadow-2xs active:scale-95 ${
            filtros.abertoAgora
              ? 'bg-amber-500 text-white font-bold shadow-xs'
              : 'bg-white dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              filtros.abertoAgora ? 'bg-white animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <Clock size={13} />
          <span>Aberto agora</span>
        </button>

        {/* Chip Preço */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuAberto(menuAberto === 'preco' ? null : 'preco')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition shadow-2xs active:scale-95 ${
              filtros.faixaPreco
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'bg-white dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
            }`}
          >
            <DollarSign size={13} />
            <span>{filtros.faixaPreco ? `Preço: ${filtros.faixaPreco}` : 'Faixa de Preço'}</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${menuAberto === 'preco' ? 'rotate-180' : ''}`}
            />
          </button>

          {menuAberto === 'preco' && (
            <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#1E1E22] p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.12)] z-50 animate-in zoom-in-95 duration-150">
              <div className="p-2 text-[12px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                Selecione o orçamento
              </div>
              <div className="space-y-0.5 pt-1">
                {PRECOS_OPCOES.map((p) => {
                  const isSel = filtros.faixaPreco === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onAlterarFiltros({
                          ...filtros,
                          faixaPreco: isSel ? null : p.id,
                        });
                        setMenuAberto(null);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                        isSel
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span>{p.label}</span>
                      {isSel && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chip Bairro */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuAberto(menuAberto === 'bairro' ? null : 'bairro')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition shadow-2xs active:scale-95 ${
              filtros.bairro
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'bg-white dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
            }`}
          >
            <MapPin size={13} />
            <span>{filtros.bairro ? `Bairro: ${filtros.bairro}` : 'Bairro'}</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${menuAberto === 'bairro' ? 'rotate-180' : ''}`}
            />
          </button>

          {menuAberto === 'bairro' && (
            <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1E1E22] p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.12)] z-50 animate-in zoom-in-95 duration-150">
              <div className="p-2 text-[12px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                Principais bairros
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                {BAIRROS_POPULARES.map((b) => {
                  const isSel = filtros.bairro === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        onAlterarFiltros({
                          ...filtros,
                          bairro: isSel ? null : b,
                        });
                        setMenuAberto(null);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                        isSel
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span>{b}</span>
                      {isSel && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
