import express from 'express';
import { middleware } from '@line/bot-sdk';
import { createEventHandler } from './handlers.js';
import { getSampleFlex, loadDashboardFlex } from './flex.js';

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
  apiRouter.post('/verify-idtoken', (req, res) => {
    const headerToken = req.headers.authorization?.toString().replace(/^Bearer\s+/i, '') ?? '';
    const bodyToken = typeof req.body?.token === 'string' ? req.body.token : '';
    const token = headerToken || bodyToken;

    if (!token) {
      return res.status(400).json({ ok: false, error: '缺少 ID Token，請確認 Authorization header 或 JSON body。' });
    }

    const segments = token.split('.');
    if (segments.length !== 3) {
      return res.status(400).json({ ok: false, error: 'ID Token 格式不正確。', todo: '正式環境請使用 LINE OpenID 公鑰驗證簽章。' });
    }

    return res.json({ ok: true, message: 'ID Token 結構檢查通過（TODO: 驗證簽章）' });
  });

  app.use('/api', apiRouter);

  const handleEvent = createEventHandler({
    client: lineClient,
    liffId,
    flexBuilder: loadDashboardFlex,
  });

  app.post(
    '/webhook',
    middleware(lineConfig),
    async (req, res, next) => {
      try {
        const results = await Promise.all(req.body.events.map(handleEvent));
        res.json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  app.use((err, req, res, next) => {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    console.error('[Bot] error:', err);
    res.status(500).json({ error: 'Webhook 處理失敗' });
  });

  return app;
}
