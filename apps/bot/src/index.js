import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client as LineClient } from '@line/bot-sdk';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from local file first
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
// Fallback to root .env
dotenv.config();

const requiredEnv = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('缺少必要環境變數：', missing.join(', '));
  process.exit(1);
}

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new LineClient(lineConfig);
const liffId = process.env.VITE_LIFF_ID ?? '';

const app = createApp({ lineConfig, lineClient, liffId });
const port = Number(process.env.PORT ?? 3000);
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[Bot] Server listening on port ${port}`);
});
