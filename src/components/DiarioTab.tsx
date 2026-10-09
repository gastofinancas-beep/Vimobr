import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import StarRating from './StarRating';
import { PlaceImage } from './ui';
import MascotMessage from './MascotMessage';
import { photoUrl } from '../lib/places';
import { NOMES_MESES } from '../lib/diario';
import type { Review } from '../types';

interface DiarioTabProps {
  reviews: Review[];
  onAbrirLugar: (placeId: string) => void;
  onNovaIda?: () => void;
  somenteLeitura?: boolean;
}

const fotoDe = (r: Review) =>
  r.photos?.[0] || r.placePhotoUrl || (r.placePhotoName ? photoUrl(r.placePhotoName, 200) : null);

export default function DiarioTab({
  reviews,
  onAbrirLugar,
  onNovaIda,
  somenteLeitura,
}: DiarioTabProps) {
  const [busca, setBusca] = useState('');

  // Filtragem suave por estabelecimento ou texto
  const filtradas = useMemo(() => {
    if (!busca.trim()) return reviews;
    const q = busca.toLowerCase().trim();
    return reviews.filter((r) => {
      const nomeMatch = r.placeName.toLowerCase().includes(q);
      const textoMatch = r.text?.toLowerCase().includes(q) || false;
      const dataStr = new Date(r.visitedAt).toLocaleDateString('pt-BR');
      return nomeMatch || textoMatch || dataStr.includes(q);
    });
  }, [reviews, busca]);

  const ordenadas = useMemo(
    () => [...filtradas].sort((a, b) => b.visitedAt - a.visitedAt),
    [filtradas]
  );

  // Agrupamento por mês ("Outubro 2026")
  const grupos = useMemo(() => {
    const lista: { titulo: string; itens: Review[] }[] = [];
    for (const r of ordenadas) {
      const d = new Date(r.visitedAt);
      const mesNome = NOMES_MESES[d.getMonth()] || '';
      const titulo = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${d.getFullYear()}`;
      const ultimo = lista[lista.length - 1];
      if (ultimo && ultimo.titulo === titulo) {
        ultimo.itens.push(r);
      } else {
        lista.push({ titulo, itens: [r] });
      }
    }
    return lista;
  }, [ordenadas]);

  if (reviews.length === 0) {
    return (
      <MascotMessage
        reaction={somenteLeitura ? 'explorando' : 'incentivando'}
        title={somenteLeitura ? 'Nenhuma ida registrada' : 'Seu diário começa aqui'}
        subtitle={
          somenteLeitura
            ? 'Quando esta pessoa registrar idas, elas aparecem aqui.'
            : 'Cada lugar que você registrar entra aqui, organizado por mês.'
        }
        ctaLabel={onNovaIda && !somenteLeitura ? 'Registrar primeira ida' : undefined}
        onCta={onNovaIda && !somenteLeitura ? onNovaIda : undefined}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Campo de Busca */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
          <Search size={16} strokeWidth={1.8} />
        </span>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no diário"
          aria-label="Buscar no diário"
          className="w-full h-10 pl-9 pr-9 rounded-lg bg-s2 text-base text-ink placeholder:text-muted outline-none ring-1 ring-transparent focus:ring-primary transition"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nada no diário para "{busca}".</p>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h3 className="text-sm font-semibold text-ink pb-1">{g.titulo}</h3>

              <div className="divide-y divide-line">
                {g.itens.map((r) => {
                  const d = new Date(r.visitedAt);
                  const dia = String(d.getDate()).padStart(2, '0');
                  const foto = fotoDe(r);

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onAbrirLugar(r.placeId)}
                      aria-label={`Ver avaliação de ${r.placeName}`}
                      className="w-full flex items-center gap-3 py-2.5 text-left transition-colors hover:bg-s1 cursor-pointer"
                    >
                      {/* Dia */}
                      <span className="w-7 text-right text-lg font-semibold tabular text-muted shrink-0">{dia}</span>

                      {/* Pôster */}
                      <PlaceImage src={foto} name={r.placeName} className="h-[54px] w-10 shrink-0 rounded-sm" />

                      {/* Lugar, nota e trecho */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold text-ink">{r.placeName}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <StarRating value={r.overall || 0} size={12} />
                          {r.text && <span className="truncate text-sm text-muted">{r.text}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
