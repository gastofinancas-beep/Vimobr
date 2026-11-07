import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

// Auto-seed de cidades no startup (roda em segundo plano, não bloqueia o servidor)
async function seedCidadesNecessarias(): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return;
  try {
    const { cidadeJaImportada, importarCidade } = await import('./scripts/seed-cidades.js');
    const cidades = [
      { nome: 'São José dos Campos', lat: -23.1896, lng: -45.8841, key: 'sao-jose-dos-campos-sp' },
    ];
    for (const c of cidades) {
      const jaTemDados = await cidadeJaImportada(c.key);
      if (!jaTemDados) {
        console.log(`[seed] Iniciando importação de ${c.nome}...`);
        const r = await importarCidade(c.nome, c.lat, c.lng, c.key);
        console.log(`[seed] ${c.nome}: ${r.importados} lugares importados`);
      } else {
        console.log(`[seed] ${c.nome} já está no banco (OK)`);
      }
    }
  } catch (e: any) {
    console.warn('[seed] Erro no auto-seed:', e.message);
  }
}

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

type GooglePlace = {
  id: string;
  displayName?: { text: string };
};

// Verificação de lugar via Google Places (server-side, chave nunca exposta ao cliente)
// SKU "Text Search Pro" (places.id + places.displayName): 5.000 req/mês grátis.
// O check de nome usa fuzzy match (qualquer palavra > 2 letras) para tolerar variações
// de grafia do usuário. Cidade/bairro ficam implícitos na textQuery.
app.post('/api/verificar-lugar', async (req, res) => {
  const { nome, endereco } = req.body as { placeId?: string; nome?: string; endereco?: string };
  if (!nome) {
    return res.status(400).json({ erro: 'nome é obrigatório' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.json({ status: 'pending_review' });
  }

  try {
    const url = `https://places.googleapis.com/v1/places:searchText`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({ textQuery: `${nome}${endereco ? ', ' + endereco : ''}`, maxResultCount: 1 }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      console.error('[verificar-lugar] Google Places error', resp.status);
      return res.json({ status: 'verification_error' });
    }

    const data = await resp.json() as { places?: GooglePlace[] };
    const found = data.places?.[0];

    if (!found) {
      return res.json({ status: 'pending_review' });
    }

    // Verifica se o nome digitado pelo usuário tem alguma palavra presente no nome do Google.
    // Fuzzy: remove acentos e pontuação, ignora palavras com ≤ 2 letras (artigos, preposições).
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
    const palavras = normalize(nome).split(/\s+/).filter(w => w.length > 2);
    const googleNome = normalize(found.displayName?.text || '');
    const match = palavras.length > 0 && palavras.some(p => googleNome.includes(p));

    if (!match) {
      return res.json({ status: 'pending_review' });
    }

    // Retorna só o place_id do Google — único campo que os Termos de Uso permitem guardar
    // indefinidamente. Nome, endereço e coordenadas ficam com o que o usuário digitou ou
    // com dados do OSM; o place_id serve apenas como chave de deduplicação.
    return res.json({ status: 'verified', googlePlaceId: found.id });
  } catch (err) {
    console.error('[verificar-lugar] erro:', err);
    return res.json({ status: 'verification_error' });
  }
});

// Endpoint para disparar importação manual de uma cidade (requer FIREBASE_SERVICE_ACCOUNT)
app.post('/api/seed-cidade', async (req, res) => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(501).json({ erro: 'FIREBASE_SERVICE_ACCOUNT não configurado' });
  }
  const { cidade, lat, lng, cityKey } = req.body as { cidade?: string; lat?: number; lng?: number; cityKey?: string };
  if (!cidade || !lat || !lng) {
    return res.status(400).json({ erro: 'cidade, lat e lng são obrigatórios' });
  }
  try {
    const { importarCidade } = await import('./scripts/seed-cidades.js');
    const r = await importarCidade(cidade, lat, lng, cityKey);
    return res.json(r);
  } catch (e: any) {
    return res.status(500).json({ erro: e.message });
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
    // Seed em segundo plano — não aguarda para não atrasar o servidor
    void seedCidadesNecessarias();
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

