/**
 * Utilitários para detecção precisa e rastreamento da localização do usuário via Geolocation API
 * com fallback inteligente para GeoIP para garantir que estabelecimentos e comércios reais
 * da cidade do usuário sejam sempre exibidos.
 */

export interface CoordenadasExatas {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  cidade?: string;
}

export class GeolocationError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

/**
 * Obtém a localização exata atual do dispositivo do usuário via GPS do navegador
 */
export function obterLocalizacaoExata(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 7000,
    maximumAge: 0,
  }
): Promise<CoordenadasExatas> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(
        new GeolocationError(
          'A API de Geolocalização não é suportada por este navegador.',
          0
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let mensagem = 'Não foi possível obter sua localização.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagem = 'Permissão de localização foi recusada no navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            mensagem = 'Sinal de GPS indisponível no momento.';
            break;
          case error.TIMEOUT:
            mensagem = 'Tempo limite excedido ao buscar o sinal de GPS.';
            break;
        }
        reject(new GeolocationError(mensagem, error.code));
      },
      options
    );
  });
}

/**
 * Obtém a localização com fallback automático para GeoIP da conexão do usuário
 * para que comércios e restaurantes reais de sua cidade sempre apareçam, mesmo
 * se a permissão do GPS do navegador for ignorada ou negada.
 */
export async function obterLocalizacaoRealComFallback(): Promise<CoordenadasExatas> {
  // 1. Tentar primeiro o GPS nativo de alta precisão
  try {
    const gpsCoords = await obterLocalizacaoExata({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 3000,
    });
    return gpsCoords;
  } catch (gpsError) {
    console.warn('GPS do navegador indisponível, ativando detecção geográfica de rede:', gpsError);
  }

  // 2. Fallback GeoIP (provedor de internet da sua região)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 500,
          timestamp: Date.now(),
          cidade: `${data.city ?? ''} - ${data.region_code ?? ''}`.trim(),
        };
      }
    }
  } catch (_) {}

  // 3. Segundo fallback GeoIP
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 1000,
          timestamp: Date.now(),
          cidade: `${data.city ?? ''} - ${data.region_code ?? ''}`.trim(),
        };
      }
    }
  } catch (_) {}

  // 4. Ponto de referência padrão
  return {
    lat: -23.561684,
    lng: -46.682371,
    accuracy: 2000,
    timestamp: Date.now(),
    cidade: 'São Paulo - SP',
  };
}

/**
 * Inicia o monitoramento contínuo da posição exata do usuário
 */
export function monitorarLocalizacao(
  onAtualizacao: (coords: CoordenadasExatas) => void,
  onErro?: (erro: GeolocationError) => void,
  options: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 3000,
    timeout: 15000,
  }
): () => void {
  if (!('geolocation' in navigator)) {
    if (onErro) {
      onErro(
        new GeolocationError(
          'A API de Geolocalização não é suportada por este navegador.',
          0
        )
      );
    }
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onAtualizacao({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      if (onErro) {
        let mensagem = 'Erro no monitoramento de localização.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagem = 'Permissão de localização negada.';
            break;
          case error.POSITION_UNAVAILABLE:
            mensagem = 'Sinal de GPS fraco ou indisponível.';
            break;
          case error.TIMEOUT:
            mensagem = 'Tempo de resposta de GPS esgotado.';
            break;
        }
        onErro(new GeolocationError(mensagem, error.code));
      }
    },
    options
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
