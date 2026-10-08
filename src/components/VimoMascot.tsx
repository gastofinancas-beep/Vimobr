import React from 'react';

interface VimoMascotProps {
  className?: string;
  showCuriosityMarks?: boolean;
}

export default function VimoMascot({
  className = '',
  showCuriosityMarks = true,
}: VimoMascotProps) {
  return (
    <div className={`relative select-none pointer-events-none w-full flex justify-center items-end ${className}`}>
      {/* Halo de luz natural sutil atrás da cabeça do mascote para contraste limpo */}
      <div
        className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-48 sm:h-56 rounded-full bg-radial from-amber-100/30 via-orange-50/15 to-transparent blur-2xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Traços curvos laranjas de curiosidade / vivacidade (idênticos à referência visual) */}
      {showCuriosityMarks && (
        <div
          className="absolute right-4 sm:right-6 top-8 sm:top-10 z-20 flex flex-col gap-1.5 opacity-95 pointer-events-none"
          aria-hidden="true"
        >
          <span className="block w-4 sm:w-5 h-1.5 bg-[#FF6B00] rounded-full rotate-[-40deg] translate-x-1 shadow-xs" />
          <span className="block w-5 sm:w-6 h-1.5 bg-[#FF6B00] rounded-full rotate-[-40deg] shadow-xs" />
        </div>
      )}

      {/* Mascote Oficial do VIMO — Escala ajustada em -7% para proporção ideal */}
      <img
        src="/mascote.png"
        alt="Mascote VIMO"
        referrerPolicy="no-referrer"
        className="w-full max-w-[365px] sm:max-w-[395px] h-auto object-contain object-bottom pointer-events-none select-none drop-shadow-sm"
      />
    </div>
  );
}
