import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// ==========================================
// YELP PLACES API (aba Descobrir)
// A chave fica só no servidor (YELP_API_KEY). Sem chave, o app usa o OpenStreetMap.
// Cada resposta fica guardada 24 h (o máximo que os termos da Yelp permitem) e há um teto
// diário de chamadas (YELP_LIMITE_DIARIO, padrão 250) para a conta nunca passar do plano.
// ==========================================
const YELP = process.env.YELP_URL || 'https://api.yelp.com/v3'; // YELP_URL só para teste local
const CACHE_YELP = new Map<string, { em: number; dados: unknown }>();
const DIA_MS = 24 * 60 * 60 * 1000;
let chamadasHoje = { dia: new Date().toDateString(), total: 0 };

function chaveYelp(): string {
  return process.env.YELP_API_KEY || '';
}

async function chamarYelp<T>(caminho: string): Promise<T | null> {
  const guardado = CACHE_YELP.get(caminho);
  if (guardado && Date.now() - guardado.em < DIA_MS) return guardado.dados as T;
  const chave = chaveYelp();
  if (!chave) return null;
  const hoje = new Date().toDateString();
  if (chamadasHoje.dia !== hoje) chamadasHoje = { dia: hoje, total: 0 };
  const limite = Number(process.env.YELP_LIMITE_DIARIO) || 250;
  if (chamadasHoje.total >= limite) return null;
  chamadasHoje.total++;
  const res = await fetch(`${YELP}${caminho}`, {
    headers: { Authorization: `Bearer ${chave}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.warn('Yelp respondeu', res.status, await res.text().catch(() => ''));
    return null;
  }
  const dados = (await res.json()) as T;
  CACHE_YELP.set(caminho, { em: Date.now(), dados });
  if (CACHE_YELP.size > 2000) CACHE_YELP.delete(CACHE_YELP.keys().next().value as string);
  return dados;
}

interface NegocioYelp {
  id: string;
  name: string;
  image_url?: string;
  url?: string;
  review_count?: number;
  rating?: number;
  price?: string;
  coordinates?: { latitude: number; longitude: number };
  location?: { address1?: string; city?: string; state?: string; display_address?: string[] };
  display_phone?: string;
  phone?: string;
  categories?: { alias: string; title: string }[];
  transactions?: string[];
  distance?: number;
  photos?: string[];
  hours?: { open: { day: number; start: string; end: string }[]; is_open_now?: boolean }[];
}

const DIAS_OSM = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const hhmm = (v: string) => `${v.slice(0, 2)}:${v.slice(2)}`;

// Horário da Yelp → formato do OpenStreetMap, que o app já sabe ler
function horarioYelp(n: NegocioYelp): string | undefined {
  const aberturas = n.hours?.[0]?.open;
  if (!aberturas?.length) return undefined;
  const porDia = new Map<number, string[]>();
  for (const o of aberturas) porDia.set(o.day, [...(porDia.get(o.day) ?? []), `${hhmm(o.start)}-${hhmm(o.end)}`]);
  return DIAS_OSM.map((d, i) => `${d} ${porDia.get(i)?.join(',') ?? 'off'}`).join('; ');
}

function tipoYelp(n: NegocioYelp): string {
  const a = (n.categories ?? []).map((c) => c.alias).join(' ');
  if (/coffee|cafe/.test(a)) return 'cafe';
  if (/bakeries|bakery|patisserie/.test(a)) return 'bakery';
  if (/bars|pubs|beer|cocktail|wine_bars|brewpubs/.test(a)) return 'bar';
  return 'restaurant';
}

function lugarDaYelp(n: NegocioYelp) {
  const end = n.location?.display_address?.join(', ') || n.location?.address1 || '';
  const cidade = n.location?.city ? `${n.location.city}${n.location.state ? ' - ' + n.location.state : ''}` : undefined;
  const t = new Set(n.transactions ?? []);
  return {
    id: `yelp-${n.id}`,
    name: n.name,
    address: end,
    lat: n.coordinates?.latitude ?? 0,
    lng: n.coordinates?.longitude ?? 0,
    photoUrl: n.image_url || undefined,
    photos: n.photos?.length ? n.photos : undefined,
    priceLevel: n.price || undefined,
    notaExterna: n.rating ? { fonte: 'Yelp', nota: n.rating, total: n.review_count ?? 0 } : undefined,
    urlFonte: n.url,
    tipo: tipoYelp(n),
    cuisine: n.categories?.[0]?.title,
    cityName: cidade,
    distanceKm: n.distance != null ? n.distance / 1000 : undefined,
    phone: n.display_phone || n.phone || undefined,
    horario: horarioYelp(n),
    servicos: t.size ? { entrega: t.has('delivery') || undefined, retirada: t.has('pickup') || undefined } : undefined,
  };
}

// Lugares perto de um ponto (o Descobrir chama uma vez por cidade)
app.get('/api/lugares/perto', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ lugares: [] });
  if (!chaveYelp()) return res.json({ fonte: null, lugares: [] });
  try {
    // ~1 km de precisão: pessoas no mesmo bairro reaproveitam a mesma resposta
    const caminho =
      `/businesses/search?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&radius=5000` +
      `&categories=restaurants,cafes,coffee,bakeries,bars&sort_by=distance&limit=50&locale=pt_BR`;
    const dados = await chamarYelp<{ businesses?: NegocioYelp[] }>(caminho);
    return res.json({ fonte: dados ? 'yelp' : null, lugares: (dados?.businesses ?? []).map(lugarDaYelp) });
  } catch (e) {
    console.warn('Erro na busca da Yelp:', e);
    return res.json({ fonte: null, lugares: [] });
  }
});

// Detalhe de um lugar da Yelp: fotos e horário
app.get('/api/lugares/yelp/:id', async (req, res) => {
  const id = String(req.params.id).replace(/[^A-Za-z0-9_-]/g, '');
  if (!id || !chaveYelp()) return res.json({ lugar: null });
  try {
    const dados = await chamarYelp<NegocioYelp>(`/businesses/${id}?locale=pt_BR`);
    return res.json({ lugar: dados ? lugarDaYelp(dados) : null });
  } catch (e) {
    console.warn('Erro no detalhe da Yelp:', e);
    return res.json({ lugar: null });
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

