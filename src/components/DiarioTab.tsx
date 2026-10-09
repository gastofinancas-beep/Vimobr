import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import StarRating from './StarRating';
import PlacePlaceholder from './PlacePlaceholder';
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
        reaction="comendo"
        title="Nenhuma ida registrada ainda"
        subtitle="Registre seus restaurantes favoritos e construa seu diário gastronômico!"
        ctaLabel={onNovaIda && !somenteLeitura ? 'Registrar primeira ida' : undefined}
        onCta={onNovaIda && !somenteLeitura ? onNovaIda : undefined}
      />
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Campo de Busca */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
          <Search size={15} />
        </span>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no diário..."
          aria-label="Buscar no diário"
          className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition"
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
        <div className="py-10 text-center text-[13px] text-[var(--muted)]">
          Nenhuma resenha encontrada para "{busca}".
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.titulo} className="space-y-1">
              <div className="text-[12px] font-medium text-[var(--muted)] pb-1">
                {g.titulo}
              </div>

              <div className="bg-[var(--s1)] border border-[var(--line)] rounded-xl overflow-hidden divide-y divide-[var(--line)]">
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
                      className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-[var(--s2)] transition cursor-pointer"
                    >
                      {/* Dia em 18px font-medium var(--muted), largura 26px */}
                      <span className="w-[26px] text-right text-[18px] font-medium text-[var(--muted)] shrink-0">
                        {dia}
                      </span>

                      {/* Pôster 40x54 px */}
                      <div className="w-[40px] h-[54px] rounded-md overflow-hidden bg-[var(--s2)] border border-[var(--line)] shrink-0">
                        {foto ? (
                          <img
                            src={foto}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PlacePlaceholder name={r.placeName} className="w-full h-full" />
                        )}
                      </div>

                      {/* Nome do lugar (14px font-medium) e estrelas (13px em var(--star)) */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {r.placeName}
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating value={r.overall || 0} size={13} />
                          {r.text && (
                            <span className="text-[12px] text-[var(--muted)] truncate max-w-[180px]">
                              {r.text}
                            </span>
                          )}
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
