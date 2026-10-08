// Source: Google Maps Platform Code Assist
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let loaderPromise: Promise<typeof google> | null = null;
let googleMapsFalhou = false;

export class GoogleMapsError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'GoogleMapsError';
    this.code = code;
  }
}

export function getMapsApiKey(): string {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  const placesKey = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined;
  if (placesKey && placesKey.trim()) {
    return placesKey.trim();
  }
  try {
    const localKey = localStorage.getItem('vimo_gmaps_api_key');
    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  } catch {}
  return '';
}

/**
 * Inicializa a biblioteca do Google Maps de forma oficial via @googlemaps/js-api-loader
 * com suporte completo a 'maps', 'places', 'marker', 'routes' e 'core'.
 */
export async function initGoogleMaps(timeoutMs = 8000): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return (window as any).google;
  }

  if (googleMapsFalhou) {
    throw new GoogleMapsError('Google Maps indisponível na sessão atual.', 'PREVIOUS_FAILURE');
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  const apiKey = getMapsApiKey();
  if (!apiKey) {
    googleMapsFalhou = true;
    throw new GoogleMapsError('Chave VITE_GOOGLE_MAPS_API_KEY não configurada no ambiente.', 'NO_API_KEY');
  }

  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    let finalizado = false;

    const timer = setTimeout(() => {
      if (!finalizado) {
        finalizado = true;
        loaderPromise = null;
        googleMapsFalhou = true;
        reject(
          new GoogleMapsError(
            `Timeout de ${timeoutMs}ms excedido ao carregar a Google Maps JS API.`,
            'TIMEOUT'
          )
        );
      }
    }, timeoutMs);

    const handleAuthFailure = () => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timer);
        loaderPromise = null;
        googleMapsFalhou = true;
        reject(
          new GoogleMapsError(
            'Falha de autenticação no Google Maps (faturamento não ativado ou chave inválida).',
            'AUTH_FAILURE'
          )
        );
      }
    };

    window.addEventListener('gmp-auth-failure', handleAuthFailure, { once: true });

    (async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'pt-BR',
          region: 'BR',
        });

        await Promise.all([
          importLibrary('maps'),
          importLibrary('places'),
          importLibrary('marker'),
          importLibrary('routes'),
          importLibrary('core'),
        ]);

        if (!finalizado) {
          finalizado = true;
          clearTimeout(timer);
          window.removeEventListener('gmp-auth-failure', handleAuthFailure);
          resolve((window as any).google);
        }
      } catch (err: any) {
        if (!finalizado) {
          finalizado = true;
          clearTimeout(timer);
          loaderPromise = null;
          googleMapsFalhou = true;
          window.removeEventListener('gmp-auth-failure', handleAuthFailure);
          reject(
            new GoogleMapsError(
              err?.message || 'Erro ao carregar bibliotecas do Google Maps.',
              'LOAD_ERROR'
            )
          );
        }
      }
    })();
  });

  return loaderPromise;
}

/**
 * Carrega dinamicamente qualquer biblioteca do Google Maps
 */
export async function getGoogleMapsLibrary<T = any>(name: string, timeoutMs = 8000): Promise<T> {
  await initGoogleMaps(timeoutMs);
  return (await importLibrary(name as any)) as T;
}

/**
 * Retorna se a API do Google Maps está disponível
 */
export function isGoogleMapsConfigured(): boolean {
  return !!getMapsApiKey() && !googleMapsFalhou;
}

/**
 * Reseta o estado para permitir novas tentativas caso o usuário configure a chave
 */
export function resetarGoogleMapsState(): void {
  loaderPromise = null;
  googleMapsFalhou = false;
}
