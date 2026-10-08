import React from 'react';

export default function VimoMascot({ className = '' }: { className?: string }) {
  return (
    <div className={`relative select-none pointer-events-none flex justify-center items-end ${className}`}>
      {/* traços laranjas de curiosidade da identidade visual */}
      <div className="absolute -right-2 top-4 z-20 flex flex-col gap-1.5 pointer-events-none" aria-hidden="true">
        <span className="block w-5 h-1.5 bg-[var(--star)] rounded-full rotate-[-40deg] translate-x-1" />
        <span className="block w-6 h-1.5 bg-[var(--star)] rounded-full rotate-[-40deg]" />
      </div>
      <img
        src="/mascote.png"
        alt="Mascote VIMO"
        referrerPolicy="no-referrer"
        className="w-full max-w-[260px] sm:max-w-[300px] h-auto object-contain object-bottom pointer-events-none select-none"
      />
    </div>
  );
}
