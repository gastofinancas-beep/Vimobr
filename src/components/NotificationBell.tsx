import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { contarNaoLidas } from '../lib/notifications';

export default function NotificationBell({
  currentUserUid,
  onClick,
  className,
}: {
  currentUserUid: string;
  onClick: () => void;
  className?: string;
}) {
  const [naoLidas, setNaoLidas] = useState(0);

  const atualizar = () => {
    setNaoLidas(contarNaoLidas(currentUserUid));
  };

  useEffect(() => {
    atualizar();
    const handleUpdate = () => atualizar();
    window.addEventListener('garfo:notifications_updated', handleUpdate);
    return () => window.removeEventListener('garfo:notifications_updated', handleUpdate);
  }, [currentUserUid]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${className || 'inline-flex items-center justify-center w-10 h-10 rounded-full text-muted hover:text-ink hover:bg-s2 transition-colors cursor-pointer'}`}
      aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} novas` : 'Notificações'}
    >
      <Bell size={19} strokeWidth={1.8} />
      {naoLidas > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-star px-1 text-[10px] font-bold leading-none text-white ring-2 ring-bg tabular">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </button>
  );
}
