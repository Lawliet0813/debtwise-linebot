import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Client, middleware } from '@line/bot-sdk';
import { configureHandlers, handleEvent } from './handlers.js';
import { buildDashboardFlex } from './flex/dashboard.js';
import { verifyLineIdToken } from '../lib/auth/verifyLineIdToken.js';
import { computeLineSignature } from './utils/signature.js';
import { logError, logInfo } from './utils/logger.js';

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

const apiRouter = express.Router();
apiRouter.use(express.json());
apiRouter.post('/verify-idtoken', async (req, res) => {
  const headerToken = req.headers.authorization?.toString().replace(/^Bearer\s+/i, '') ?? '';
  const bodyToken = typeof req.body?.token === 'string' ? req.body.token : '';
  const token = headerToken || bodyToken;

  if (!token) {
    return res.status(400).json({ ok: false, error: '缺少 ID Token，請確認 Authorization header 或 JSON body。' });
  }

  const channelId = process.env.LOGIN_CHANNEL_ID ?? process.env.LINE_CHANNEL_ID ?? process.env.VITE_LIFF_ID;
  const issuer = process.env.LOGIN_ISSUER ?? 'https://access.line.me';
  try {
    const payload = await verifyLineIdToken(token, channelId, issuer);
    return res.json({ ok: true, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ID Token 驗證失敗';
    const status = /缺少 LINE Channel ID/.test(message) ? 500 : 400;
    return res.status(status).json({ ok: false, error: message, todo: '正式環境請使用 LINE OpenID 公鑰驗證簽章。' });
  }
});

app.use('/api', apiRouter);

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
  if (req.path.startsWith('/webhook')) return next();
  if (req.path === '/health') return next();

  if (path.extname(req.path)) return next();

  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  return next();
});

export default app;
