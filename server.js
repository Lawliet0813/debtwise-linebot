import 'dotenv/config';
import express from 'express';
import { Client, middleware as lineMiddleware } from '@line/bot-sdk';
import { info, error } from './utils/logger.js';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const app = express();

app.post('/webhook', lineMiddleware(config), async (req, res) => {
  try {
    const results = await Promise.all(req.body.events.map(handleEvent));
    res.json(results);
  } catch (err) {
    error('Error handling events', err);
    res.status(500).end();
  }
});

const client = new Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const response = {
    type: 'text',
    text: 'DebtWise AI 已啟動 ✅'
  };

  return client.replyMessage(event.replyToken, response);
}

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  info(`Server listening on port ${PORT}`);
});
