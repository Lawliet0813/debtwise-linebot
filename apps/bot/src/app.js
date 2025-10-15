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
