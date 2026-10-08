import React, { useState } from 'react';
import { X, Compass, Plus, Trash2, MapPin, Check } from 'lucide-react';
import type { UserProfile, Place, WishlistItem, Review, GastronomicItinerary } from '../types';
import { SAMPLE_PLACES } from '../lib/places';

export default function RoteiroModal({
  currentUser,
  wishlistItems,
  reviews,
  onClose,
  onSalvo,
}: {
  currentUser: UserProfile;
  wishlistItems: WishlistItem[];
  reviews: Review[];
  onClose: () => void;
  onSalvo: (itinerary: GastronomicItinerary) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);

  // Recolher todos os lugares disponíveis (Wishlist + Lugares avaliados + Sample places)
  const availablePlacesMap = new Map<string, { id: string; name: string; address?: string; photoUrl?: string }>();

  wishlistItems.forEach((w) => {
    availablePlacesMap.set(w.placeId, {
      id: w.placeId,
      name: w.placeName,
      address: w.placeAddress,
      photoUrl: w.placePhotoUrl,
    });
  });

  reviews.forEach((r) => {
    if (!availablePlacesMap.has(r.placeId)) {
      availablePlacesMap.set(r.placeId, {
        id: r.placeId,
        name: r.placeName,
        photoUrl: r.photos?.[0] || r.placePhotoUrl,
      });
    }
  });

  SAMPLE_PLACES.forEach((p) => {
    if (!availablePlacesMap.has(p.id)) {
      availablePlacesMap.set(p.id, {
        id: p.id,
        name: p.name,
        address: p.address,
        photoUrl: p.photoUrl,
      });
    }
  });

  const availablePlaces = Array.from(availablePlacesMap.values());

  const handleTogglePlace = (id: string) => {
    if (selectedPlaceIds.includes(id)) {
      setSelectedPlaceIds(selectedPlaceIds.filter((i) => i !== id));
    } else {
      setSelectedPlaceIds([...selectedPlaceIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedPlaceIds.length === 0) return;

    const newItinerary: GastronomicItinerary = {
      id: `itinerary-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      creatorUid: currentUser.uid,
      creatorName: currentUser.displayName,
      creatorHandle: currentUser.handle,
      creatorPhoto: currentUser.photoURL,
      placeIds: selectedPlaceIds,
      createdAt: Date.now(),
      likesCount: 0,
    };

    onSalvo(newItinerary);
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
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Novo Roteiro Gastronômico</h3>
              <p className="text-xs text-muted">Crie uma coleção temática para compartilhar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Título do Roteiro *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Melhores Hambúrgueres de SP"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 rounded-2xl border border-line bg-bg px-4 text-xs font-medium text-ink focus:border-accent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Descrição / Introdução
            </label>
            <textarea
              rows={3}
              placeholder="Conte a proposta deste roteiro, dicas de horários ou o que esperar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-line bg-bg p-3 text-xs font-medium text-ink focus:border-accent outline-none resize-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Selecione os Lugares ({selectedPlaceIds.length} selecionados) *
              </label>
              <span className="text-[11px] text-accent">Escolha da sua Wishlist e histórico</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {availablePlaces.map((p) => {
                const isSelected = selectedPlaceIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePlace(p.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-line bg-s1">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-accent">
                            <MapPin size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{p.name}</p>
                        <p className="text-[11px] text-muted truncate">{p.address || 'São Paulo - SP'}</p>
                      </div>
                    </div>

                    <div
                      className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected ? 'border-accent bg-accent text-bg' : 'border-line bg-s1 text-transparent'
                      }`}
                    >
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || selectedPlaceIds.length === 0}
              className="h-12 w-full rounded-full bg-accent text-bg font-bold text-xs shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              Criar Roteiro Gastronômico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
