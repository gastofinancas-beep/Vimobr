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

app.use(express.json({ limit: '100kb' }));

type GooglePlace = {
  id: string;
  displayName?: { text: string };
};

// Verificação de lugar via Google Places (server-side, chave nunca exposta ao cliente)
// SKU "Text Search Pro" (places.id + places.displayName): 5.000 req/mês grátis.
// O check de nome usa fuzzy match (qualquer palavra > 2 letras) para tolerar variações
// de grafia do usuário. Cidade/bairro ficam implícitos na textQuery.
//
// Proteção contra abuso (a consulta ao Google é o único ponto do app que pode gerar cobrança):
// só atende quem está logado no app, com limite por pessoa e um teto diário geral que mantém
// o mês dentro da cota grátis mesmo no pior caso.
const LIMITE_POR_PESSOA_DIA = Number(process.env.VERIFICAR_LIMITE_PESSOA_DIA) || 10;
const LIMITE_GERAL_DIA = Number(process.env.VERIFICAR_LIMITE_GERAL_DIA) || 150; // 150 x 31 = 4.650 < 5.000
const usoDoDia = { dia: '', total: 0, porPessoa: new Map<string, number>() };

function dentroDoLimite(uid: string): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  if (usoDoDia.dia !== hoje) {
    usoDoDia.dia = hoje;
    usoDoDia.total = 0;
    usoDoDia.porPessoa.clear();
  }
  const dele = usoDoDia.porPessoa.get(uid) ?? 0;
  if (dele >= LIMITE_POR_PESSOA_DIA || usoDoDia.total >= LIMITE_GERAL_DIA) return false;
  usoDoDia.porPessoa.set(uid, dele + 1);
  usoDoDia.total += 1;
  return true;
}

let verificadorDeLogin: Promise<import('firebase-admin/auth').Auth> | null = null;

/** Confere o token do Firebase Auth enviado pelo app. Não precisa de service account. */
async function uidDoPedido(req: express.Request): Promise<string | null> {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  if (!token) return null;
  try {
    if (!verificadorDeLogin) {
      verificadorDeLogin = (async () => {
        const { initializeApp } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        const { default: config } = await import('./firebase-applet-config.json', { with: { type: 'json' } });
        return getAuth(initializeApp({ projectId: config.projectId }, 'verificador-de-login'));
      })();
    }
    const decodificado = await (await verificadorDeLogin).verifyIdToken(token);
    return decodificado.uid;
  } catch (err) {
    console.warn('[verificar-lugar] token recusado:', (err as Error).message);
    return null;
  }
}

app.post('/api/verificar-lugar', async (req, res) => {
  const { nome, endereco } = req.body as { placeId?: string; nome?: string; endereco?: string };
  if (!nome || typeof nome !== 'string' || nome.length > 120 || (endereco && String(endereco).length > 200)) {
    return res.status(400).json({ erro: 'nome é obrigatório' });
  }

  const uid = await uidDoPedido(req);
  if (!uid) {
    return res.status(401).json({ erro: 'Entre na sua conta para cadastrar um lugar.' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.json({ status: 'pending_review' });
  }

  if (!dentroDoLimite(uid)) {
    return res.status(429).json({ erro: 'Limite de cadastros de hoje atingido. Tente amanhã.' });
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
    // Express 5 não aceita mais a rota '*': o fallback do SPA é o último middleware
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
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

