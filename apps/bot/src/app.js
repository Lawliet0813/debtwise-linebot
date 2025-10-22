import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Client, middleware } from '@line/bot-sdk';
import { configureHandlers, handleEvent } from './handlers.js';
import { buildDashboardFlex } from './flex/dashboard.js';
import { computeLineSignature } from './utils/signature.js';
import { logError, logInfo } from './utils/logger.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const indexHtmlPath = path.join(publicDir, 'index.html');

const channelSecret = process.env.LINE_CHANNEL_SECRET ?? '';
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';

logInfo({
  scope: 'startup',
  'token.len': channelAccessToken.length,
  'secret.len': channelSecret.length,
});

if (!channelSecret || !channelAccessToken) {
  throw new Error('缺少 LINE channel 設定，請確認環境變數。');
}

export const lineConfig = {
  channelSecret,
  channelAccessToken,
};

export const client = new Client(lineConfig);
configureHandlers({ client });

const app = express();
app.disable('x-powered-by');

const corsOrigin = process.env.CORS_ALLOW_ORIGIN;
if (process.env.NODE_ENV === 'production' && !corsOrigin) {
  logError({
    scope: 'startup',
    message: 'CORS_ALLOW_ORIGIN should be set in production for security',
  });
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin ?? '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

if (process.env.DEBUG_TEST_MODE === '1') {
  app.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
    const headerSig = req.get('x-line-signature') ?? '';
    const secret = process.env.LINE_CHANNEL_SECRET ?? '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '');
    const localSig = computeLineSignature(secret, rawBody);

    logInfo({
      scope: 'signature',
      'secret.len': secret.length,
      header: headerSig,
      local: localSig,
      equal: headerSig === localSig,
    });

    if (!headerSig) {
      return res.status(401).json({ error: 'no signature' });
    }
    if (!secret) {
      return res.status(500).json({ error: 'missing channel secret' });
    }
    if (headerSig !== localSig) {
      return res.status(401).json({ error: 'bad signature' });
    }
    return res.status(200).end();
  });
}

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/flex/sample', (_req, res) => {
  res.json(buildDashboardFlex().contents);
});

app.use('/auth', authRouter);

app.post('/webhook', middleware(lineConfig), (req, res) => {
  res.status(200).end();

  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  logInfo({ scope: 'webhook', events: events.length });

  for (const ev of events) {
    logInfo({
      scope: 'event',
      type: ev.type,
      source: ev.source?.type,
      mode: ev.mode,
    });

    Promise.resolve(handleEvent(ev)).catch((error) => {
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status) {
        logError({ scope: 'handleEvent', status, data });
      } else {
        logError({
          scope: 'handleEvent',
          message: error instanceof Error ? error.message : error,
        });
      }
    });
  }
});

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

app.use((req, res, next) => {
  const methodOk = req.method === 'GET' || req.method === 'HEAD';
  if (!methodOk) return next();

  const acceptHeader = req.headers.accept ?? '';
  const expectsHtml = acceptHeader.includes('text/html') || req.method === 'HEAD';
  if (!expectsHtml) return next();

  if (req.path === '/api' || req.path.startsWith('/api/')) return next();
  if (req.path === '/auth' || req.path.startsWith('/auth/')) return next();
  if (req.path.startsWith('/webhook')) return next();
  if (req.path === '/health') return next();

  if (path.extname(req.path)) return next();

  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  return next();
});

export { app };
export default app;
