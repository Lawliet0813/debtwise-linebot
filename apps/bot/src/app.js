import express from 'express';
import { middleware } from '@line/bot-sdk';
import { createEventHandler } from './handlers.js';
import { getSampleFlex, loadDashboardFlex } from './flex.js';
import { verifyLineIdToken } from '../lib/auth/verifyLineIdToken.js';

export function createApp({ lineConfig, lineClient, liffId }) {
  if (!lineConfig?.channelAccessToken || !lineConfig?.channelSecret) {
    throw new Error('缺少 LINE channel 設定，請確認環境變數。');
  }

  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (req, res) => {
    res.type('text/plain').send('OK BOT');
  });

  app.get('/flex/sample', (req, res) => {
    res.json(getSampleFlex());
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

  const handleEvent = createEventHandler({
    client: lineClient,
    liffId,
    flexBuilder: loadDashboardFlex,
  });

  app.post('/webhook', middleware(lineConfig), async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleEvent));
      res.status(200).end();
    } catch (error) {
      console.error('[Webhook Error]', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });


  return app;
}
