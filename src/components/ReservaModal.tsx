import { useState } from 'react';
import { X, Calendar, Clock, Bell, CheckCircle2, MapPin, AlertCircle } from 'lucide-react';
import { criarReservaReminder } from '../lib/reservas';
import type { Place, UserProfile } from '../types';
import { photoUrl } from '../lib/places';

export default function ReservaModal({
  place,
  currentUser,
  onClose,
  onSucesso,
}: {
  place: Place;
  currentUser: UserProfile;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const [dataVisita, setDataVisita] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [horaVisita, setHoraVisita] = useState<string>('20:00');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      const dateTimeStr = `${dataVisita}T${horaVisita}:00`;
      const timestamp = new Date(dateTimeStr).getTime();

      if (isNaN(timestamp) || timestamp <= Date.now()) {
        setErro('Por favor, escolha uma data e horário futuros válidos.');
        setEnviando(false);
        return;
      }

      await criarReservaReminder({
        userId: currentUser.uid,
        placeId: place.id,
        placeName: place.name,
        placePhotoUrl: place.photoUrl || (place.photoName ? photoUrl(place.photoName, 400) : undefined),
        dateTime: timestamp,
        note: nota.trim() || undefined,
      });

      onSucesso();
    } catch (err: any) {
      console.error('Erro ao agendar lembrete:', err);
      setErro('Não foi possível agendar o lembrete. Tente novamente.');
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line bg-s1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Lembrete de Reserva</h3>
              <p className="text-xs text-muted">Agende uma notificação para visitar o local</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAgendar} className="p-5 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Card do Lugar */}
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-s2/60 p-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-line bg-bg shrink-0">
              {place.photoUrl || place.photoName ? (
                <img
                  src={place.photoUrl || photoUrl(place.photoName, 200)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                  {place.name[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-bold text-ink truncate">{place.name}</h4>
              <p className="text-[11px] text-muted truncate">{place.address || place.cityName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Calendar size={13} className="text-accent" />
                Data
              </label>
              <input
                type="date"
                value={dataVisita}
                onChange={(e) => setDataVisita(e.target.value)}
                className="h-11 w-full rounded-2xl border border-line bg-bg px-3 text-xs text-ink focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Clock size={13} className="text-accent" />
                Horário
              </label>
              <input
                type="time"
                value={horaVisita}
                onChange={(e) => setHoraVisita(e.target.value)}
                className="h-11 w-full rounded-2xl border border-line bg-bg px-3 text-xs text-ink focus:border-accent focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Observações / Ocasião (Opcional)
            </label>
            <textarea
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: Aniversário da família, mesa na varanda, pedir o tartare..."
              className="w-full rounded-2xl border border-line bg-bg p-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none leading-relaxed font-display"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="h-12 w-full rounded-full bg-accent text-bg font-bold text-xs shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {enviando ? (
                <span>Agendando...</span>
              ) : (
                <>
                  <Bell size={16} />
                  <span>Agendar Lembrete & Ativar Notificação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
