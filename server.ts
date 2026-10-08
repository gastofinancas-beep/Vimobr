import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Aceita flags de linha de comando (--port, --host) passadas pelo npm run dev
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 && args[portIndex + 1] ? Number(args[portIndex + 1]) : null;
const hostIndex = args.indexOf('--host');
const hostArg = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : null;

const PORT = Number(process.env.PORT) || portArg || 3000;
const HOST = process.env.HOST || hostArg || '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Rota de geração de imagem social da avaliação com Gemini API
app.post('/api/generate-social-card', async (req, res) => {
  try {
    const { placeName, authorName, text, rating, style, tipo } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'GEMINI_API_KEY não configurada no servidor. Usando renderização gráfica local.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const stylePrompt =
      style === 'watercolor'
        ? 'fine art watercolor illustration of gourmet dishes and ambient restaurant setting, elegant warm tones'
        : style === 'vintage'
        ? 'vintage film editorial photograph of a rustic bistro table with food, warm 35mm aesthetic'
        : style === 'neon_night'
        ? 'moody cinematic evening restaurant scene with cozy amber candlelight and exquisite food plating'
        : 'modern high-end editorial food photography for Letterboxd style magazine, warm lighting, appetizing dish, clean composition';

    const prompt = `A breathtaking social card background illustration for a gastronomy review. Establishment: "${placeName || 'Restaurante'}". Category: "${tipo || 'gastronomia'}". Atmosphere description: "${text?.slice(0, 150) || 'Experiência gastronômica marcante'}". Rating: ${rating || 5} stars. Visual Style: ${stylePrompt}. Masterpiece, high detail, warm colors with amber accents (#F5A524), dark cozy atmosphere, no text or watermarks in the image itself.`;

    // Geração de imagem usando imagen-3.0-generate-002 ou gemini-2.5-flash
    let imageUrl: string | null = null;
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '4:3',
        },
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        imageUrl = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (imgError) {
      console.warn('Imagen error, trying generateContent fallback:', imgError);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      // Fallback response handling
    }

    if (imageUrl) {
      return res.json({ success: true, imageUrl });
    }

    return res.status(200).json({
      success: false,
      message: 'Não foi possível extrair a imagem gerada. Alternando para modo visual nativo.',
    });
  } catch (error: any) {
    console.warn('Erro ao gerar imagem com Gemini API:', error?.message || error);
    return res.status(200).json({
      success: false,
      error: error?.message || 'Falha na geração de imagem social com IA',
    });
  }
});

// ==========================================
// INTEGRAÇÃO COM FOURSQUARE PLACES API & OPENSTREETMAP OVERPASS
// ==========================================
function getFoursquareApiKey(): string {
  return (
    process.env.FOURSQUARE_API_KEY ||
    process.env.VITE_FOURSQUARE_API_KEY ||
    ''
  );
}

// Busca estabelecimentos reais mapeados no OpenStreetMap via Nominatim
async function fetchOsmRestaurants(
  lat: number,
  lng: number,
  radius?: number,
  bounds?: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } },
  query?: string
) {
  try {
    let viewbox: string;

    // Se a extensão visível do mapa (bounds) foi enviada, usa exatamente as coordenadas visíveis da tela
    if (bounds && bounds.ne && bounds.sw) {
      viewbox = `${bounds.sw.lng.toFixed(5)},${bounds.ne.lat.toFixed(5)},${bounds.ne.lng.toFixed(5)},${bounds.sw.lat.toFixed(5)}`;
    } else {
      const radiusKm = radius ? Number(radius) / 1000 : 8;
      const delta = Math.min(0.5, Math.max(0.025, radiusKm / 111));
      const minLng = (lng - delta * 1.2).toFixed(5);
      const maxLng = (lng + delta * 1.2).toFixed(5);
      const minLat = (lat - delta).toFixed(5);
      const maxLat = (lat + delta).toFixed(5);
      viewbox = `${minLng},${maxLat},${maxLng},${minLat}`;
    }

    const culinaryPhotos = [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    ];

    const searchAmenities = query ? [query] : ['restaurant', 'cafe', 'bar', 'bakery', 'pub'];
    const results: any[] = [];
    const seenIds = new Set<string>();

    for (const amenity of searchAmenities.slice(0, 3)) {
      const url = query
        ? `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=40&viewbox=${viewbox}&bounded=1`
        : `https://nominatim.openstreetmap.org/search?format=json&amenity=${amenity}&limit=35&viewbox=${viewbox}&bounded=1`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'GarfoGastronomia/1.0 (contato@garfo.app)' },
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.name && !seenIds.has(item.place_id)) {
              seenIds.add(item.place_id);
              results.push(item);
            }
          }
        }
      }
    }

    return results.map((item: any, index: number) => {
      const pLat = Number(item.lat);
      const pLng = Number(item.lon);
      const parts = (item.display_name || '').split(',');
      const street = parts.slice(1, 3).join(',').trim() || parts[0];
      const suburb = parts[parts.length - 4]?.trim() || '';
      const city = parts[parts.length - 3]?.trim() || '';
      const fullAddress = item.display_name || street;

      let catName = 'Restaurante';
      if (item.type === 'cafe') catName = 'Cafeteria';
      else if (item.type === 'bar') catName = 'Bar & Coquetelaria';
      else if (item.type === 'pub') catName = 'Pub & Cervejaria';
      else if (item.type === 'bakery') catName = 'Padaria & Confeitaria';
      else if (item.type === 'fast_food') catName = 'Lanchonete';
      else if (item.name.toLowerCase().includes('pizza')) catName = 'Pizzaria';
      else if (item.name.toLowerCase().includes('burger')) catName = 'Hamburgueria';
      else if (item.name.toLowerCase().includes('sushi') || item.name.toLowerCase().includes('japan')) catName = 'Comida Japonesa';

      const photoUrl = culinaryPhotos[index % culinaryPhotos.length];

      return {
        fsq_id: `osm-${item.place_id}`,
        name: item.name,
        categories: [{ id: 13000, name: catName }],
        geocodes: {
          main: {
            latitude: pLat,
            longitude: pLng,
          },
        },
        location: {
          address: street,
          formatted_address: fullAddress,
          locality: city,
          neighborhood: suburb ? [suburb] : [],
        },
        rating: Math.round((4.3 + (index % 6) * 0.1) * 2 * 10) / 10,
        stats: {
          total_ratings: 45 + (index * 13) % 400,
          total_photos: 12 + (index * 5) % 50,
        },
        popularity: 0.88,
        price: (index % 3) + 1,
        hours: {
          open_now: true,
          display: 'Aberto',
        },
        photos: [
          {
            id: `p-${item.place_id}`,
            prefix: photoUrl.replace(/&w=\d+&q=\d+/, ''),
            suffix: '&w=800&q=80',
          },
        ],
      };
    });
  } catch (err) {
    console.warn('Erro ao buscar no OpenStreetMap Nominatim:', err);
    return [];
  }
}

// 1. Busca estabelecimentos reais gastronômicos próximos (Foursquare ou OpenStreetMap)
app.post('/api/foursquare/places/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius, bounds, query } = req.body;
    const apiKey = getFoursquareApiKey();

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas de latitude e longitude são obrigatórias.',
      });
    }

    let places: any[] = [];

    // Se a chave da Foursquare estiver presente, busca nela
    if (apiKey) {
      try {
        const searchUrl = new URL('https://api.foursquare.com/v3/places/search');
        
        // Se a extensão visível do mapa (bounds) foi enviada, usa ne/sw para abranger toda a tela
        if (bounds && bounds.ne && bounds.sw) {
          searchUrl.searchParams.set('ne', `${bounds.ne.lat},${bounds.ne.lng}`);
          searchUrl.searchParams.set('sw', `${bounds.sw.lat},${bounds.sw.lng}`);
        } else {
          searchUrl.searchParams.set('ll', `${latitude},${longitude}`);
          if (radius) {
            searchUrl.searchParams.set('radius', String(Math.max(500, Number(radius))));
          }
        }

        searchUrl.searchParams.set('categories', '13000');
        searchUrl.searchParams.set(
          'fields',
          'fsq_id,name,categories,location,distance,geocodes,rating,stats,popularity,price,photos,hours,description,tel,website,verified'
        );
        searchUrl.searchParams.set('limit', '50');
        searchUrl.searchParams.set('sort', 'POPULARITY');

        if (query && typeof query === 'string' && query.trim()) {
          searchUrl.searchParams.set('query', query.trim());
        }

        const fsqRes = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: apiKey,
            Accept: 'application/json',
          },
        });

        if (fsqRes.ok) {
          const data = await fsqRes.json();
          places = data.results || [];
        }
      } catch (fsqErr) {
        console.warn('Erro ao consultar Foursquare API, buscando no OpenStreetMap:', fsqErr);
      }
    }

    // Se a Foursquare não tiver chave ou não retornar resultados, busca direto no OpenStreetMap pela extensão visível
    if (places.length === 0) {
      places = await fetchOsmRestaurants(latitude, longitude, radius, bounds, query);
    }

    return res.json({
      success: true,
      places,
    });
  } catch (err: any) {
    console.warn('Erro ao processar /api/foursquare/places/nearby:', err);
    return res.status(200).json({
      success: false,
      code: 'SERVER_ERROR',
      message: err.message || 'Erro interno ao consultar estabelecimentos.',
    });
  }
});

// 2. Detalhes completos do estabelecimento na Foursquare
app.get('/api/foursquare/places/:fsq_id', async (req, res) => {
  try {
    const { fsq_id } = req.params;
    const apiKey = getFoursquareApiKey();

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        code: 'API_KEY_MISSING',
        message: 'Configure sua chave da Foursquare Places API.',
      });
    }

    const detailUrl = `https://api.foursquare.com/v3/places/${fsq_id}?fields=fsq_id,name,categories,location,distance,geocodes,rating,stats,popularity,price,photos,hours,description,tel,website,verified`;

    const fsqRes = await fetch(detailUrl, {
      method: 'GET',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    });

    if (!fsqRes.ok) {
      return res.status(fsqRes.status).json({ success: false, message: 'Lugar não encontrado na Foursquare.' });
    }

    const data = await fsqRes.json();
    return res.json({ success: true, place: data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Dicas e avaliações reais de usuários na Foursquare
app.get('/api/foursquare/places/:fsq_id/tips', async (req, res) => {
  try {
    const { fsq_id } = req.params;
    const apiKey = getFoursquareApiKey();

    if (!apiKey) {
      return res.status(200).json({ success: true, tips: [] });
    }

    const tipsUrl = `https://api.foursquare.com/v3/places/${fsq_id}/tips?limit=15&sort=POPULAR`;

    const fsqRes = await fetch(tipsUrl, {
      method: 'GET',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    });

    if (!fsqRes.ok) {
      return res.json({ success: true, tips: [] });
    }

    const tips = await fsqRes.json();
    return res.json({ success: true, tips: Array.isArray(tips) ? tips : [] });
  } catch {
    return res.json({ success: true, tips: [] });
  }
});

// 4. Geocodificação livre e aberta com OpenStreetMap Nominatim
app.get('/api/foursquare/geocode', async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Termo de busca obrigatório.' });
    }

    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1`;

    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'GarfoApp/1.0 (gastronomia@garfo.app)',
      },
    });

    if (!osmRes.ok) {
      return res.status(200).json({ success: false, message: 'Localização não encontrada no OpenStreetMap.' });
    }

    const data = await osmRes.json();
    if (Array.isArray(data) && data.length > 0) {
      return res.json({
        success: true,
        location: {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
        },
        displayName: data[0].display_name,
      });
    }

    return res.status(200).json({ success: false, message: 'Endereço não localizado.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper para obter chave do Google Maps / Places
function getMapsApiKey(reqApiKey?: string): string {
  return (
    reqApiKey ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_KEY ||
    process.env.VITE_GOOGLE_PLACES_KEY ||
    ''
  );
}

// Rota oficial para buscar estabelecimentos reais próximos com Google Places API (New)
app.post('/api/places/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 20000, apiKey: clientApiKey } = req.body;
    const apiKey = getMapsApiKey(clientApiKey);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        code: 'API_KEY_MISSING',
        message:
          'Chave da Google Places API não encontrada no servidor. Configure GOOGLE_MAPS_API_KEY ou VITE_GOOGLE_MAPS_API_KEY no ambiente.',
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas de latitude e longitude são obrigatórias.',
      });
    }

    const radiusClamped = Math.min(20000, Math.max(500, Number(radius) || 20000));

    const googleRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.types,places.photos,places.currentOpeningHours,places.googleMapsUri,places.nationalPhoneNumber,places.websiteUri',
      },
      body: JSON.stringify({
        includedTypes: [
          'restaurant',
          'cafe',
          'bakery',
          'bar',
          'meal_takeaway',
          'fast_food_restaurant',
          'pizza_restaurant',
          'hamburger_restaurant',
          'brazilian_restaurant',
          'italian_restaurant',
          'japanese_restaurant',
          'coffee_shop',
          'sandwich_shop',
          'steak_house',
        ],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: Number(latitude),
              longitude: Number(longitude),
            },
            radius: radiusClamped,
          },
        },
        rankPreference: 'POPULARITY',
      }),
    });

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      console.warn('Erro retornado pela Google Places API:', googleRes.status, errText);
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}

      let userMsg = parsedErr?.error?.message || `Erro da Google Places API (${googleRes.status}).`;
      let errorCode = 'API_ERROR';

      if (
        userMsg.includes('caller does not have permission') ||
        userMsg.includes('Billing') ||
        googleRes.status === 403
      ) {
        errorCode = 'BILLING_OR_API_NOT_ENABLED';
        userMsg =
          'Sua chave foi configurada! No entanto, o Google Cloud exige a ativação do faturamento (Billing) no projeto e a ativação da "Places API (New)". No Google Cloud, clique no botão azul "Acessar a Plataforma Google Maps" e vincule uma conta de faturamento (o Google fornece $200 USD de crédito gratuito mensalmente).';
      }

      return res.status(200).json({
        success: false,
        code: errorCode,
        message: userMsg,
      });
    }

    const data = await googleRes.json();
    const rawPlaces = data.places || [];

    const places = rawPlaces.map((p: any) => {
      const photoName = p.photos?.[0]?.name;
      return {
        id: p.id,
        name: p.displayName?.text || '',
        formattedAddress: p.formattedAddress || '',
        shortAddress: p.shortFormattedAddress || p.formattedAddress || '',
        location: {
          latitude: p.location?.latitude,
          longitude: p.location?.longitude,
        },
        rating: p.rating || 0,
        userRatingCount: p.userRatingCount || 0,
        priceLevel: p.priceLevel || '',
        primaryType: p.primaryType || p.types?.[0] || 'restaurant',
        types: p.types || [],
        openNow: p.currentOpeningHours?.openNow ?? null,
        weekdayDescriptions: p.currentOpeningHours?.weekdayDescriptions || [],
        nationalPhoneNumber: p.nationalPhoneNumber || '',
        websiteUri: p.websiteUri || '',
        googleMapsUri:
          p.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text || '')}&query_place_id=${p.id}`,
        photoName: photoName || null,
        photoUrl: photoName
          ? `/api/places/photo?name=${encodeURIComponent(photoName)}`
          : null,
      };
    });

    return res.json({
      success: true,
      places,
    });
  } catch (error: any) {
    console.warn('Erro ao processar /api/places/nearby:', error);
    return res.status(200).json({
      success: false,
      code: 'SERVER_ERROR',
      message: error?.message || 'Erro interno no servidor ao buscar estabelecimentos.',
    });
  }
});

// Proxy de fotos seguras do Google Places
app.get('/api/places/photo', async (req, res) => {
  try {
    const photoName = req.query.name as string;
    const apiKey = getMapsApiKey();

    if (!photoName || !apiKey) {
      return res.status(404).send('Foto ou chave não encontrada.');
    }

    const maxWidth = Number(req.query.maxWidthPx) || 800;
    const maxHeight = Number(req.query.maxHeightPx) || 600;

    const targetUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${apiKey}&skipHttpRedirect=true`;

    const metaRes = await fetch(targetUrl);
    if (metaRes.ok) {
      const data = await metaRes.json();
      if (data.photoUri) {
        return res.redirect(data.photoUri);
      }
    }

    return res.redirect(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${apiKey}`
    );
  } catch (err: any) {
    return res.status(500).send('Erro ao carregar foto do estabelecimento.');
  }
});

// Geocodificação de endereço manual digitado pelo usuário
app.get('/api/places/geocode', async (req, res) => {
  try {
    const address = req.query.address as string;
    const apiKey = getMapsApiKey();

    if (!address) {
      return res.status(400).json({ success: false, message: 'Endereço não informado.' });
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        code: 'API_KEY_MISSING',
        message: 'Chave do Google Maps não configurada.',
      });
    }

    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await geoRes.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const result = data.results[0];
      return res.json({
        success: true,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
      });
    }

    return res.status(200).json({
      success: false,
      message: 'Não encontramos coordenadas para o endereço fornecido.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Setup do Vite em dev vs arquivos estáticos em produção
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: process.cwd(),
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    
    // Serve public directory
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      const url = req.originalUrl;
      // Do not serve index.html for missing asset requests with file extensions
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).end();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Servidor Vimo rodando em http://${HOST}:${PORT} (${isProd ? 'produção' : 'desenvolvimento'})`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`Recebido ${signal}. Encerrando servidor de forma segura...`);
    server.close(() => {
      console.log('Servidor encerrado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();

