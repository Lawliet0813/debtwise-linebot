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
const liffId = process.env.VITE_LIFF_ID ?? 'YOUR_LIFF_ID';
const dryRun = process.argv.includes('--dry-run') || !token;

const menuPath = path.resolve(root, 'richmenu/menu.json');
const payload = JSON.parse(fs.readFileSync(menuPath, 'utf-8'));
payload.areas = payload.areas.map((area) => {
  if (area.action?.uri?.includes('${VITE_LIFF_ID}')) {
    return {
      ...area,
      action: {
        ...area.action,
        uri: `https://liff.line.me/${liffId}`,
      },
    };
  }
  return area;
});

if (dryRun) {
  console.log('[richmenu-create] DRY RUN 模式。輸出 payload：');
  console.log(JSON.stringify(payload, null, 2));
  if (!token) {
    console.log('⚠️  未提供 LINE_CHANNEL_ACCESS_TOKEN，請將其填入 apps/bot/.env.local 後再執行。');
  }
  process.exit(0);
}

const client = new Client({ channelAccessToken: token, channelSecret: process.env.LINE_CHANNEL_SECRET });

client.createRichMenu(payload)
  .then((id) => {
    console.log('[richmenu-create] 建立成功，RichMenu ID:', id);
  })
  .catch((err) => {
    console.error('[richmenu-create] 建立失敗:', err.message);
    process.exitCode = 1;
  });
