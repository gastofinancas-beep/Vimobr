import React from 'react';
import { corDoLugar } from './ui';

/**
 * Lugar sem foto: bloco de cor lisa da identidade com o nome,
 * no mesmo formato de pôster usado no Explorar.
 */
export default function PlacePlaceholder({
  name,
  className = 'h-48 w-full',
}: {
  name?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={name || 'Lugar sem foto'}
      className={`relative flex items-end overflow-hidden ${className}`}
      style={{ backgroundColor: corDoLugar(name) }}
    >
      {name && (
        <span className="w-full p-3 text-sm font-semibold leading-snug text-white line-clamp-2">
          {name}
        </span>
      )}
    </div>
  );
}
