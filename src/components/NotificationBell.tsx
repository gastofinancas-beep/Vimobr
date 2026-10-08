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
      className={
        className ||
        "relative w-9 h-9 rounded-full bg-white dark:bg-[#18181B] shadow-xs border border-gray-200/80 dark:border-neutral-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:border-[var(--star)] transition"
      }
      aria-label={`Notificações ${naoLidas > 0 ? `(${naoLidas} novas)` : ''}`}
      title="Notificações"
    >
      <Bell size={18} className={naoLidas > 0 ? 'text-[var(--star)]' : ''} />
      {naoLidas > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--star)] px-1 text-[12px] font-bold text-white shadow-md ring-2 ring-white dark:ring-neutral-900">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </button>
  );
}
