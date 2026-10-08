import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  showScore?: boolean;
}

export default function StarRating({
  value,
  onChange,
  size = 20,
  showScore = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    if (!onChange) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - left < width / 2;
    setHoverValue(isHalf ? i + 0.5 : i + 1);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    if (!onChange) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - left < width / 2;
    const novo = isHalf ? i + 0.5 : i + 1;
    onChange(novo === value ? Math.max(0.5, novo - 0.5) : novo);
  };

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="radiogroup"
      onMouseLeave={() => setHoverValue(null)}
    >
      <div className={`flex items-center ${size >= 24 ? 'gap-1.5 sm:gap-2' : 'gap-0.5'}`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const cheia = displayValue >= i + 1;
          const meia = !cheia && displayValue >= i + 0.5;

          if (!onChange) {
            return (
              <span
                key={i}
                className="relative inline-block"
                style={{ width: size, height: size }}
                aria-hidden="true"
              >
                {/* Estrela de Fundo Vazia */}
                <Star
                  size={size}
                  className="absolute inset-0 text-neutral-300 dark:text-[#44403C] transition-colors"
                  strokeWidth={1.5}
                />

                {/* Meia Estrela */}
                {meia && (
                  <StarHalf
                    size={size}
                    className="absolute inset-0 fill-[var(--star)] text-[var(--star)] transition-colors"
                    strokeWidth={1.5}
                  />
                )}

                {/* Estrela Cheia */}
                {cheia && (
                  <Star
                    size={size}
                    className="absolute inset-0 fill-[var(--star)] text-[var(--star)] transition-colors"
                    strokeWidth={1.5}
                  />
                )}
              </span>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onMouseMove={(e) => handleMouseMove(e, i)}
              onClick={(e) => handleClick(e, i)}
              aria-label={`${i + 1} estrelas`}
              className="relative transition-transform focus:outline-hidden hover:scale-110 active:scale-95 cursor-pointer"
              style={{ width: size, height: size }}
            >
              {/* Estrela de Fundo Vazia */}
              <Star
                size={size}
                className="absolute inset-0 text-neutral-300 dark:text-[#44403C] transition-colors"
                strokeWidth={1.5}
              />

              {/* Meia Estrela */}
              {meia && (
                <StarHalf
                  size={size}
                  className="absolute inset-0 fill-[var(--star)] text-[var(--star)] transition-colors"
                  strokeWidth={1.5}
                />
              )}

              {/* Estrela Cheia */}
              {cheia && (
                <Star
                  size={size}
                  className="absolute inset-0 fill-[var(--star)] text-[var(--star)] transition-colors"
                  strokeWidth={1.5}
                />
              )}
            </button>
          );
        })}
      </div>

      {showScore && (
        <span className="text-xs font-bold text-[var(--ink)] tabular-nums ml-1">
          {displayValue.toFixed(1)}
        </span>
      )}
    </div>
  );
}
