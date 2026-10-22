import { useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import StarRating from './StarRating';
import { Avatar } from './ui';
import { obterCriteriosParaLugar } from '../lib/criteriosEstabelecimento';
import { CRITERIOS, type Place, type Review } from '../types';

const VOLTARIA: Record<string, string> = { com_certeza: 'Com certeza', talvez: 'Talvez', nao: 'Não' };
const PRECO: Record<string, string> = { caro: 'Caro', justo: 'Justo', barato: 'Barato' };

const nota = (n: number) => n.toFixed(1).replace('.', ',');

function rotulosDoLugar(placeName: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const c of CRITERIOS) mapa[c.key] = c.label;
  mapa.custoBeneficio = 'Custo-benefício';
  mapa.sobremesa = 'Sobremesa';
  for (const c of obterCriteriosParaLugar({ name: placeName } as Place).criterios) mapa[c.key] = c.label;
  return mapa;
}

/** Folha com a avaliação completa que o autor registrou do lugar marcado no post. */
export default function AvaliacaoSheet({
  review,
  onFechar,
  onAbrirLugar,
}: {
  review: Review;
  onFechar: () => void;
  onAbrirLugar: (placeId: string) => void;
}) {
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', tecla);
    };
  }, [onFechar]);

  const rotulos = rotulosDoLugar(review.placeName);
  const criterios = Object.entries(review.ratings ?? {}).filter(
    (e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0
  );
  const fotos = review.photos ?? [];
  const quando = new Date(review.visitedAt || review.createdAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const detalhes = [
    review.pratoDestaque && { titulo: 'Prato destaque', valor: review.pratoDestaque },
    review.voltaria && { titulo: 'Voltaria', valor: VOLTARIA[review.voltaria] },
    review.precoPercepcao && { titulo: 'Preço', valor: PRECO[review.precoPercepcao] },
  ].filter(Boolean) as { titulo: string; valor: string }[];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Avaliação de ${review.placeName}`}
        className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[88vh] max-w-2xl flex-col rounded-t-2xl bg-bg"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        <header className="flex items-start gap-3 px-5 pt-2 pb-4 shrink-0">
          <Avatar src={review.authorPhoto} name={review.authorName} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted truncate">
              Avaliação de <span className="font-semibold text-ink">{review.authorName}</span>
            </p>
            <h2 className="font-display text-[19px] font-bold leading-tight text-ink">{review.placeName}</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Ida em {quando}
              {review.cityName ? ` · ${review.cityName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-s2 cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex items-center gap-4 rounded-2xl bg-s1 p-4 ring-1 ring-line">
            <span className="font-display text-[36px] font-extrabold leading-none text-ink tabular">{nota(review.overall)}</span>
            <div>
              <StarRating value={review.overall} size={18} />
              <p className="mt-1 text-[12px] text-muted">Nota geral</p>
            </div>
          </div>

          {fotos.length > 0 && (
            <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
              {fotos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-40 w-32 shrink-0 snap-start rounded-xl object-cover bg-s2"
                />
              ))}
            </div>
          )}

          {criterios.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {criterios.map(([chave, valor]) => (
                <li key={chave} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[14px] text-ink-2">{rotulos[chave] ?? chave}</span>
                  <span className="flex items-center gap-2">
                    <StarRating value={valor} size={14} />
                    <span className="w-7 text-right text-[13px] font-semibold text-ink tabular">{nota(valor)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {detalhes.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {detalhes.map((d) => (
                <div key={d.titulo} className={`rounded-xl bg-s1 p-3 ring-1 ring-line ${d.titulo === 'Prato destaque' ? 'col-span-2' : ''}`}>
                  <dt className="text-[12px] text-muted">{d.titulo}</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-ink">{d.valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {review.text && <p className="mt-4 text-[14px] leading-relaxed text-ink whitespace-pre-line">{review.text}</p>}
        </div>

        <div className="px-5 pt-2 pb-5 pb-safe shrink-0">
          <button
            type="button"
            onClick={() => {
              onFechar();
              onAbrirLugar(review.placeId);
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-bg cursor-pointer"
          >
            <MapPin size={17} strokeWidth={2} />
            Ver o lugar
          </button>
        </div>
      </div>
    </>
  );
}
