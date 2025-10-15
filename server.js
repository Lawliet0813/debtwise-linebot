import 'dotenv/config';
import express from 'express';
import { Client, middleware as lineMiddleware } from '@line/bot-sdk';
import { info, error } from './utils/logger.js';
import { assertSupabaseEnv } from './lib/supabase.js';
import pkg from './package.json' with { type: 'json' };
import { parseCommand } from './core/commands.js';
import { handleAdd, handleList, handlePay, handlePlan } from './core/handlers.js';
import { buildMainQuickReply } from './ui/replies.js';
import { errorTexts } from './ui/errors.js';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const { version } = pkg;

assertSupabaseEnv();
info('Supabase environment variables verified');

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

app.get('/health', (req, res) => {
  res.json({ ok: true, version });
});

const client = new Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const lineUserId = event.source?.userId ?? null;
  const commandResult = parseCommand(event.message.text);
  const replyMessages = [];

  const pushText = (text) => {
    const message = { type: 'text', text };
    if (replyMessages.length === 0) {
      message.quickReply = buildMainQuickReply();
    }
    replyMessages.push(message);
  };

  const pushFlex = (flexMessage) => {
    const message = { ...flexMessage };
    if (replyMessages.length === 0) {
      message.quickReply = buildMainQuickReply();
    }
    replyMessages.push(message);
  };

  try {
    switch (commandResult.type) {
      case 'add':
        pushText(await handleAdd(lineUserId, commandResult.payload));
        break;
      case 'list':
        {
          const result = await handleList(lineUserId);
          if (result.text) {
            pushText(result.text);
          }
          if (result.flexMessage) {
            pushFlex(result.flexMessage);
          }
        }
        break;
      case 'pay':
        pushText(await handlePay(lineUserId, commandResult.payload));
        break;
      case 'plan':
        {
          const result = await handlePlan(lineUserId, commandResult.payload);
          if (result.text) {
            pushText(result.text);
          }
          if (result.flexMessage) {
            pushFlex(result.flexMessage);
          }
        }
        break;
      case 'invalid':
      case 'unknown':
        pushText(commandResult.error);
        break;
      default:
        pushText('指令尚未支援，輸入 /help 查看可用指令。');
    }
  } catch (err) {
    error('Command handling failed', err);
    replyMessages.length = 0;
    pushText(errorTexts.systemBusy());
  }

  const messages = replyMessages.length > 0 ? replyMessages : [{ type: 'text', text: '指令尚未支援，輸入 /help 查看可用指令。' }];

  return client.replyMessage(event.replyToken, messages);
}

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  info(`Server listening on port ${PORT}`);
});
