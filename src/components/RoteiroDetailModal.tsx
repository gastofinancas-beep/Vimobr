import React from 'react';
import { X, Compass, MapPin, Heart, Share2, Star } from 'lucide-react';
import type { GastronomicItinerary } from '../types';
import { SAMPLE_PLACES, photoUrl } from '../lib/places';

export default function RoteiroDetailModal({
  itinerary,
  onClose,
  onAbrirLugar,
}: {
  itinerary: GastronomicItinerary;
  onClose: () => void;
  onAbrirLugar: (placeId: string) => void;
}) {
  // Encontrar os lugares correspondentes
  const stops = itinerary.placeIds
    .map((id: string, index: number) => {
      const found = SAMPLE_PLACES.find((p) => p.id === id);
      if (found) return { ...found, step: index + 1 };
      return {
        id,
        name: `Local #${index + 1}`,
        address: 'São Paulo - SP',
        lat: -23.56,
        lng: -46.68,
        photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        step: index + 1,
      };
    });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: itinerary.title,
        text: itinerary.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link do roteiro copiado para a área de transferência!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line bg-s1 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
              <Compass size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-ink truncate">{itinerary.title}</h3>
              <p className="text-xs text-muted truncate">Por {itinerary.creatorName} ({itinerary.creatorHandle})</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-full border border-line bg-s2 text-muted hover:text-ink transition"
              title="Compartilhar Roteiro"
            >
              <Share2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-muted hover:text-ink transition">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {itinerary.description && (
            <div className="rounded-2xl border border-line/80 bg-bg p-4">
              <p className="font-display text-xs italic text-[#DDD3C4] leading-relaxed">
                “{itinerary.description}”
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Itinerário ({stops.length} paradas)
            </h4>

            <div className="space-y-3">
              {stops.map((stop) => (
                <div
                  key={stop.id}
                  onClick={() => {
                    onClose();
                    onAbrirLugar(stop.id);
                  }}
                  className="rounded-2xl border border-line bg-bg p-3.5 hover:border-accent/50 transition cursor-pointer flex items-center gap-3.5 group"
                >
                  <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                    {stop.step}
                  </div>

                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-line bg-s1">
                    <img
                      src={stop.photoUrl || photoUrl(stop.photoName, 300)}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink truncate group-hover:text-accent transition">
                      {stop.name}
                    </p>
                    <p className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={12} className="text-accent shrink-0" />
                      <span>{stop.address}</span>
                    </p>
                    {stop.rating && (
                      <p className="text-[12px] text-accent font-bold mt-1">
                        ★ {stop.rating.toFixed(1).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
