import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Place, WishlistItem } from '../types';

const LS_WISHLIST_KEY = 'vimo_wishlist_';

export const INITIAL_WISHLIST: WishlistItem[] = [
  {
    placeId: 'chIJf-place-01',
    placeName: 'Maniçoba Bistrô & Café',
    placeAddress: 'Rua dos Pinheiros, 452 - Pinheiros, São Paulo - SP',
    placePhotoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    tipo: 'restaurant',
    priceLevel: 'PRICE_LEVEL_MODERATE',
    addedAt: Date.now() - 3600000 * 24 * 3,
    notes: 'Experimentar o tartare de atum com crocante de tapioca.',
  },
  {
    id: undefined,
    placeId: 'chIJf-place-04',
    placeName: 'Bar do Canto & Coquetelaria',
    placeAddress: 'Rua Mourato Coelho, 1022 - Vila Madalena, São Paulo - SP',
    placePhotoUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.6,
    tipo: 'bar',
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    addedAt: Date.now() - 3600000 * 24 * 7,
    notes: 'Ir na quinta-feira para ouvir o jazz ao vivo.',
  } as WishlistItem,
];

export function obterWishlistLocal(uid: string): WishlistItem[] {
  try {
    const raw = localStorage.getItem(LS_WISHLIST_KEY + uid);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(LS_WISHLIST_KEY + uid, JSON.stringify(INITIAL_WISHLIST));
    return INITIAL_WISHLIST;
  } catch {
    return INITIAL_WISHLIST;
  }
}

export function salvarWishlistLocal(uid: string, items: WishlistItem[]) {
  try {
    localStorage.setItem(LS_WISHLIST_KEY + uid, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('vimo_wishlist_updated', { detail: { uid, items } }));
  } catch (err) {
    console.error('Erro ao salvar wishlist localmente:', err);
  }
}

export async function obterWishlist(uid: string): Promise<WishlistItem[]> {
  const local = obterWishlistLocal(uid);
  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'lists', 'wishlist'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.items)) {
          salvarWishlistLocal(uid, data.items);
          return data.items;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar wishlist do Firestore:', err);
    }
  }
  return local;
}

export function estaNaWishlist(uid: string, placeId: string): boolean {
  const items = obterWishlistLocal(uid);
  return items.some((item) => item.placeId === placeId);
}

export async function alternarWishlist(
  uid: string,
  place: Place,
  notes?: string
): Promise<{ added: boolean; items: WishlistItem[] }> {
  const items = obterWishlistLocal(uid);
  const index = items.findIndex((i) => i.placeId === place.id);
  let updated: WishlistItem[];
  let added = false;

  if (index >= 0) {
    updated = items.filter((i) => i.placeId !== place.id);
    added = false;
  } else {
    const novoItem: WishlistItem = {
      placeId: place.id,
      placeName: place.name,
      placeAddress: place.address,
      placePhotoUrl: place.photoUrl,
      placePhotoName: place.photoName,
      rating: place.rating,
      tipo: place.tipo,
      priceLevel: place.priceLevel,
      addedAt: Date.now(),
      notes: notes || undefined,
    };
    updated = [novoItem, ...items];
    added = true;
  }

  salvarWishlistLocal(uid, updated);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'users', uid, 'lists', 'wishlist'),
        { items: updated, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao atualizar wishlist no Firestore:', err);
    }
  }

  return { added, items: updated };
}

export async function removerDaWishlist(uid: string, placeId: string): Promise<WishlistItem[]> {
  const items = obterWishlistLocal(uid);
  const updated = items.filter((i) => i.placeId !== placeId);
  salvarWishlistLocal(uid, updated);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'users', uid, 'lists', 'wishlist'),
        { items: updated, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao remover item da wishlist no Firestore:', err);
    }
  }

  return updated;
}

export async function atualizarNotaWishlist(uid: string, placeId: string, notes: string): Promise<WishlistItem[]> {
  const items = obterWishlistLocal(uid);
  const updated = items.map((item) =>
    item.placeId === placeId ? { ...item, notes: notes.trim() } : item
  );
  salvarWishlistLocal(uid, updated);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'users', uid, 'lists', 'wishlist'),
        { items: updated, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao salvar nota da wishlist no Firestore:', err);
    }
  }

  return updated;
}
