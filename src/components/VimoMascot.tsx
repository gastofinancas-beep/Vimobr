interface VimoMascotProps {
  /** true quando o campo de senha está em foco e o mascote tapa os olhos */
  coberto?: boolean;
}

/**
 * Mascote apoiado na borda superior do card de login.
 * Duas poses (PNG da identidade): olhos abertos (padrão) e tapando os olhos (campo de senha em foco).
 * Deve ser renderizado dentro de um container `relative` que começa na borda do card.
 */
export default function VimoMascot({ coberto = false }: VimoMascotProps) {
  return (
    <>
      {/* Pose com olhos tapados: desce 12,5% da própria altura para as asas encostarem na borda do card */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 z-[5] aspect-[1480/988] w-full max-w-[372px] transition-opacity duration-200 motion-reduce:transition-none ${
          coberto ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ bottom: 'calc(100% - 4px)', transform: 'translate(-50%, 12.5%)' }}
      >
        <img
          src="/mascote-senha.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{ filter: 'drop-shadow(0 3px 4px rgba(4,7,20,0.42))' }}
        />
      </div>

      {/* Pose com olhos abertos, espiando por cima do card */}
      <div
        className={`pointer-events-none absolute left-1/2 z-[4] aspect-[1480/988] w-full max-w-[372px] transition-opacity duration-200 motion-reduce:transition-none ${
          coberto ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ bottom: 'calc(100% - 42px)', transform: 'translateX(-50%)' }}
      >
        <img
          src="/mascote.webp"
          alt="Mascote do VIMO apoiado no card de login"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ filter: 'drop-shadow(0 12px 14px rgba(4,7,20,0.55))' }}
        />
        <span aria-hidden="true" className="absolute right-[4%] top-[30%] z-[5] flex flex-col gap-1.5">
          <i className="block h-1.5 w-[21px] -rotate-[40deg] rounded-full bg-[#F77947]" />
          <i className="block h-1.5 w-[17px] -rotate-[40deg] translate-x-1 rounded-full bg-[#F77947]" />
        </span>
      </div>
    </>
  );
}
