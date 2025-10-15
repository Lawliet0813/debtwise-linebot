import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import line from '@line/bot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const menuJsonPath = path.resolve(projectRoot, 'richmenu/menu.json');
const menuImagePath = path.resolve(projectRoot, 'richmenu/menu.png');
const lastIdPath = path.resolve(projectRoot, 'richmenu/.last_id');

export function resolveMenuJson() {
  if (!fs.existsSync(menuJsonPath)) {
    throw new Error(`找不到 richmenu/menu.json，請先建立該檔案。`);
  }
  const raw = fs.readFileSync(menuJsonPath, 'utf8');
  const replaced = raw.replace('${VITE_LIFF_ID}', process.env.VITE_LIFF_ID ?? 'YOUR_LIFF_ID');
  return JSON.parse(replaced);
}

export function getImagePath(customPath) {
  const candidate = customPath ? path.resolve(customPath) : menuImagePath;
  if (!fs.existsSync(candidate)) {
    throw new Error(`找不到 Rich Menu 圖片：${candidate}`);
  }
  return candidate;
}

export function getClient(dryRun) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { dryRun: true, reason: '缺少 LINE_CHANNEL_ACCESS_TOKEN' };
  }
  if (dryRun) {
    return { dryRun: true, reason: '使用 --dry-run' };
  }
  const client = new line.Client({ channelAccessToken: token });
  return { dryRun: false, client };
}

export function rememberRichMenuId(id) {
  try {
    fs.writeFileSync(lastIdPath, id, 'utf8');
  } catch (err) {
    console.warn('[richmenu] 無法寫入 .last_id:', err.message);
  }
}

export function readLastRichMenuId() {
  if (!fs.existsSync(lastIdPath)) {
    return null;
  }
  return fs.readFileSync(lastIdPath, 'utf8').trim() || null;
}

export function printDryRun(message, payload = null) {
  console.log(`[DRY RUN] ${message}`);
  if (payload) {
    console.log(JSON.stringify(payload, null, 2));
  }
}
