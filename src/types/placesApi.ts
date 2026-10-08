export interface GooglePlacesLocation {
  latitude: number;
  longitude: number;
}

export interface TrendingPlace {
  id: string;
  name: string;
  formattedAddress: string;
  shortAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  userRatingCount: number;
  priceLevel?: string;
  priceFormatted?: string;
  primaryType?: string;
  types: string[];
  categoryLabel: string;
  openNow?: boolean | null;
  weekdayDescriptions?: string[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri: string;
  photoUrl: string | null;
  photoName?: string | null;
  distanceMeters: number;
  distanceFormatted: string;
  trendingScore: number;
}

export type GeolocationStatus =
  | 'idle'
  | 'prompt'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'manual';

export interface UserCoordinates {
  lat: number;
  lng: number;
  source: 'gps' | 'manual';
  displayName?: string;
}
