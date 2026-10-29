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

// Verificação de lugar via Google Places (server-side, chave nunca exposta ao cliente)
app.post('/api/verificar-lugar', async (req, res) => {
  const { placeId, nome, endereco } = req.body as { placeId?: string; nome?: string; endereco?: string };
  if (!placeId || !nome) {
    return res.status(400).json({ erro: 'placeId e nome são obrigatórios' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Sem chave configurada: marca como pendente para revisão manual
    return res.json({ status: 'pending_review' });
  }

  try {
    const query = encodeURIComponent(`${nome}${endereco ? ' ' + endereco : ''}`);
    const url = `https://places.googleapis.com/v1/places:searchText`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: `${nome}${endereco ? ', ' + endereco : ''}`, maxResultCount: 1 }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      console.error('[verificar-lugar] Google Places error', resp.status);
      return res.json({ status: 'verification_error' });
    }

    const data = await resp.json() as { places?: Array<{ id: string; displayName?: { text: string }; formattedAddress?: string }> };
    const found = data.places?.[0];

    if (!found) {
      return res.json({ status: 'pending_review' });
    }

    // Verificação básica de correspondência por nome (normaliza e compara)
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
    const nomeNorm = normalize(nome);
    const googleNome = normalize(found.displayName?.text || '');
    const palavrasNome = nomeNorm.split(/\s+/).filter(w => w.length > 2);
    const match = palavrasNome.length > 0 && palavrasNome.some(p => googleNome.includes(p));

    if (match) {
      return res.json({ status: 'verified', googlePlaceId: found.id });
    } else {
      return res.json({ status: 'pending_review' });
    }
  } catch (err) {
    console.error('[verificar-lugar] erro:', err);
    return res.json({ status: 'verification_error' });
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
