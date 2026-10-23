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

