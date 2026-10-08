export interface FsqCategory {
  id: number;
  name: string;
  short_name?: string;
  plural_name?: string;
  icon?: {
    prefix: string;
    suffix: string;
  };
}

export interface FsqPhoto {
  id: string;
  created_at?: string;
  prefix: string;
  suffix: string;
  width?: number;
  height?: number;
}

export interface FsqTip {
  id: string;
  created_at: string;
  text: string;
  url?: string;
  agree_count?: number;
}

export interface FsqRawPlace {
  fsq_id: string;
  name: string;
  categories?: FsqCategory[];
  distance?: number;
  geocodes?: {
    main?: {
      latitude: number;
      longitude: number;
    };
    roof?: {
      latitude: number;
      longitude: number;
    };
  };
  location?: {
    address?: string;
    formatted_address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    neighborhood?: string[];
    cross_street?: string;
  };
  rating?: number; // 0 to 10 on Foursquare
  stats?: {
    total_photos?: number;
    total_ratings?: number;
    total_tips?: number;
  };
  popularity?: number;
  price?: number; // 1, 2, 3, 4
  photos?: FsqPhoto[];
  hours?: {
    is_local_holiday?: boolean;
    open_now?: boolean;
    display?: string;
    regular?: Array<{
      close: string;
      day: number;
      open: string;
    }>;
  };
  description?: string;
  tel?: string;
  website?: string;
  verified?: boolean;
}

export interface MapViewportBounds {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
}

export interface SearchPlacesOptions {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  bounds?: MapViewportBounds;
  query?: string;
}

export interface FsqNormalizedPlace {
  id: string; // fsq_id
  name: string;
  category: string;
  categories: string[];
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceFormatted: string;
  address: string;
  shortAddress: string;
  rating5: number | null; // scale of 5 (e.g. 4.7)
  rawRating10: number | null; // scale of 10 (e.g. 9.4)
  ratingsCount: number | null;
  priceLevel: string | null; // $, $$, $$$, $$$$
  priceNumber: number | null;
  openNow: boolean | null;
  hoursDisplay: string | null;
  photos: string[];
  primaryPhoto: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string;
  trendingScore: number;
}
