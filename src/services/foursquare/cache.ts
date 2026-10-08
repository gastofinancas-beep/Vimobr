import type { FsqNormalizedPlace } from '../../types/foursquare';

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const placesCache = new Map<string, CacheEntry<FsqNormalizedPlace[]>>();
const placeDetailCache = new Map<string, CacheEntry<FsqNormalizedPlace>>();

export function getCachedPlaces(key: string): FsqNormalizedPlace[] | null {
  const item = placesCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    placesCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCachedPlaces(key: string, data: FsqNormalizedPlace[]): void {
  placesCache.set(key, { timestamp: Date.now(), data });
}

export function getCachedPlaceDetail(id: string): FsqNormalizedPlace | null {
  const item = placeDetailCache.get(id);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    placeDetailCache.delete(id);
    return null;
  }
  return item.data;
}

export function setCachedPlaceDetail(id: string, data: FsqNormalizedPlace): void {
  placeDetailCache.set(id, { timestamp: Date.now(), data });
}
