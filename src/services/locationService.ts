import type { UserCoordinates, GeolocationStatus } from '../types/placesApi';

const LOCAL_STORAGE_COORDS_KEY = 'vimo_user_saved_coords_v1';

export async function consultarPermissaoLocalizacao(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return null;
  }
  try {
    const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return res.state;
  } catch {
    return null;
  }
}

export function obterCoordenadasSalvas(): UserCoordinates | null {
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_COORDS_KEY);
    if (salvo) {
      return JSON.parse(salvo);
    }
  } catch {
    // ignore
  }
  return null;
}

export function salvarCoordenadas(coords: UserCoordinates): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_COORDS_KEY, JSON.stringify(coords));
  } catch {
    // ignore
  }
}

/**
 * Solicita a geolocalização do dispositivo/navegador com tratamento completo de erros.
 */
export function solicitarLocalizacaoAtual(): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({ code: 'UNSUPPORTED', message: 'Geolocalização não é suportada por este dispositivo/navegador.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: UserCoordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        };
        salvarCoordenadas(coords);
        resolve(coords);
      },
      (err) => {
        let code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' = 'POSITION_UNAVAILABLE';
        if (err.code === err.PERMISSION_DENIED) {
          code = 'PERMISSION_DENIED';
        } else if (err.code === err.TIMEOUT) {
          code = 'TIMEOUT';
        }
        reject({ code, message: err.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Geocodifica um endereço ou bairro digitado manualmente pelo usuário via endpoint do servidor ou Places API.
 */
export async function geocodificarEnderecoManual(
  endereco: string
): Promise<{ lat: number; lng: number; displayName: string }> {
  const query = encodeURIComponent(endereco.trim());
  const res = await fetch(`/api/places/geocode?address=${query}`);

  if (!res.ok) {
    throw new Error('Falha na comunicação ao buscar endereço.');
  }

  const data = await res.json();
  if (!data.success || !data.location) {
    throw new Error(data.message || 'Endereço não encontrado pelo Google Maps.');
  }

  const coords: UserCoordinates = {
    lat: data.location.lat,
    lng: data.location.lng,
    source: 'manual',
    displayName: data.formattedAddress || endereco,
  };
  salvarCoordenadas(coords);

  return {
    lat: data.location.lat,
    lng: data.location.lng,
    displayName: data.formattedAddress || endereco,
  };
}
