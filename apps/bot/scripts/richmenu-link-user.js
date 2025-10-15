#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@line/bot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(root, '.env.local') });
dotenv.config();

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const userId = process.argv[2];
const richMenuId = process.argv[3];
const dryRun = process.argv.includes('--dry-run') || !token;

if (!userId || !richMenuId) {
  console.log('用法：node scripts/richmenu-link-user.js <USER_ID> <RICH_MENU_ID> [--dry-run]');
  process.exit(1);
}

if (dryRun) {
  console.log('[richmenu-link-user] DRY RUN 模式，將綁定：', { userId, richMenuId });
  if (!token) {
    console.log('⚠️  未提供 LINE_CHANNEL_ACCESS_TOKEN，請設定後再試。');
  }
  process.exit(0);
}

const client = new Client({ channelAccessToken: token, channelSecret: process.env.LINE_CHANNEL_SECRET });

client.linkRichMenuToUser(userId, richMenuId)
  .then(() => console.log('[richmenu-link-user] 綁定成功'))
  .catch((err) => {
    console.error('[richmenu-link-user] 綁定失敗:', err.message);
    process.exitCode = 1;
  });
