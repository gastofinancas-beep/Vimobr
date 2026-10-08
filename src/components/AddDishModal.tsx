import React, { useState } from 'react';
import { X, Flame, Star, Camera, Upload, DollarSign, Sparkles } from 'lucide-react';
import StarRating from './StarRating';
import { salvarDestaquePrato, CATEGORIAS_PRATOS } from '../lib/dishes';
import type { Place, UserProfile, DishCategory } from '../types';

export default function AddDishModal({
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
  const [dishName, setDishName] = useState('');
  const [category, setCategory] = useState<DishCategory>('Prato Principal');
  const [rating, setRating] = useState(5.0);
  const [isMustTry, setIsMustTry] = useState(true);
  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) {
      setErro('Informe o nome do prato ou item do menu.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      // Se não houver foto enviada, usa uma foto padrão gastronômica de qualidade baseada na categoria
      const fallbackPhoto =
        category === 'Entrada'
          ? 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
          : category === 'Sobremesa'
          ? 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=900&q=80'
          : category === 'Bebida & Drink'
          ? 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80'
          : category === 'Café & Confeitaria'
          ? 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80'
          : 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80';

      salvarDestaquePrato({
        placeId: place.id,
        dishName: dishName.trim(),
        category,
        rating,
        isMustTry,
        price: price.trim() || undefined,
        comment: comment.trim() || undefined,
        photoUrl: photoPreview || fallbackPhoto,
        author: {
          uid: currentUser.uid,
          name: currentUser.displayName,
          handle: currentUser.handle,
          photo: currentUser.photoURL,
        },
      });

      onSucesso();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar o destaque do prato.');
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-line bg-s1 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line bg-s1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Flame size={20} className="fill-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Destacar Prato do Menu</h2>
              <p className="text-xs text-muted truncate max-w-[240px]">
                {place.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-s2 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
          {erro && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-300 font-medium">
              {erro}
            </div>
          )}

          {/* 1. Nome do Prato */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Nome do Prato ou Item *
            </label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="Ex: Tartare de Atum com Tapioca, Croissant..."
              className="h-11 w-full rounded-2xl border border-line bg-bg px-4 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* 2. Categoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Categoria do Menu
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_PRATOS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    category === cat
                      ? 'bg-accent text-bg shadow-sm font-bold'
                      : 'bg-s2 border border-line text-muted hover:text-ink'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nota Própria do Prato e Interruptor de Imperdível */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Nota do Prato */}
            <div className="rounded-2xl border border-line bg-s2/70 p-3.5 space-y-1.5 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Sua Nota para o Prato
              </span>
              <div className="flex justify-center py-1">
                <StarRating value={rating} onChange={setRating} size={24} />
              </div>
              <span className="text-xs font-bold text-accent">
                {rating.toFixed(1).replace('.', ',')} / 5,0
              </span>
            </div>

            {/* Checkbox Imperdível */}
            <div
              onClick={() => setIsMustTry((prev) => !prev)}
              className={`rounded-2xl border p-3.5 flex flex-col justify-between cursor-pointer transition select-none ${
                isMustTry
                  ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                  : 'border-line bg-s2/70 text-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Flame size={16} className={isMustTry ? 'text-accent fill-accent' : ''} />
                  <span>Prato Imperdível</span>
                </span>
                <span className={`text-[12px] uppercase font-bold px-2 py-0.5 rounded-full ${isMustTry ? 'bg-accent text-bg' : 'bg-s1 text-muted'}`}>
                  {isMustTry ? 'Sim' : 'Opcional'}
                </span>
              </div>
              <p className="text-[11px] text-[#C0B6A7] mt-1 leading-snug">
                {isMustTry
                  ? 'Ganha o selo de destaque e recomendação especial no menu.'
                  : 'Item regular do cardápio.'}
              </p>
            </div>
          </div>

          {/* 4. Preço (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <DollarSign size={13} className="text-accent" />
              Preço Estimado (Opcional)
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: R$ 48"
              className="h-11 w-full rounded-2xl border border-line bg-bg px-4 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          {/* 5. Foto do Prato */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Camera size={13} className="text-accent" />
              Foto do Prato
            </label>

            {photoPreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-line">
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/80 p-1.5 text-white hover:bg-black transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-line bg-bg/50 hover:bg-s2/60 cursor-pointer transition">
                <Upload size={22} className="text-muted mb-1" />
                <span className="text-xs font-semibold text-ink">Toque para anexar uma foto</span>
                <span className="text-[12px] text-muted mt-0.5">JPEG, PNG ou WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 6. Comentário / Nota de Degustação */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Por que este prato é imperdível?
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Descreva o sabor, textura, molhos, ponto da carne ou o que tornou esse prato marcante..."
              className="w-full rounded-2xl border border-line bg-bg p-3.5 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="w-full h-12 rounded-2xl bg-accent text-bg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-accent/25 transition active:scale-98 disabled:opacity-50"
            >
              <Flame size={18} className="fill-bg" />
              <span>{salvando ? 'Publicando...' : 'Publicar Destaque do Menu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
