#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client } from '@line/bot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(root, '.env.local') });
dotenv.config();

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const richMenuId = process.argv[2];
const imagePath = process.argv[3];
const dryRun = process.argv.includes('--dry-run') || !token;

if (!richMenuId || !imagePath) {
  console.log('用法：node scripts/richmenu-upload-image.js <RICH_MENU_ID> <IMAGE_PATH> [--dry-run]');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error('找不到圖片檔案：', imagePath);
  process.exit(1);
}

if (dryRun) {
  console.log('[richmenu-upload-image] DRY RUN 模式，將會上傳：', { richMenuId, imagePath });
  if (!token) {
    console.log('⚠️  未提供 LINE_CHANNEL_ACCESS_TOKEN，請先設定環境變數。');
  }
  process.exit(0);
}

const client = new Client({ channelAccessToken: token, channelSecret: process.env.LINE_CHANNEL_SECRET });

const stream = fs.createReadStream(imagePath);
client.setRichMenuImage(richMenuId, stream)
  .then(() => console.log('[richmenu-upload-image] 上傳成功'))
  .catch((err) => {
    console.error('[richmenu-upload-image] 上傳失敗:', err.message);
    process.exitCode = 1;
  });
