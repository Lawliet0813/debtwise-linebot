#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { setTimeout: delay } = require('timers/promises');

const checks = [];

async function checkHttp(name, url, expected) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let ok = false;
  let message = '';
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      message = `HTTP ${res.status}`;
    } else if (!text.includes(expected)) {
      message = `回傳內容非預期（收到：${text.trim().slice(0, 50)}）`;
    } else {
      ok = true;
      message = '通過';
    }
  } catch (err) {
    message = err.name === 'AbortError' ? '連線逾時' : err.message;
  } finally {
    clearTimeout(timeout);
  }
  checks.push({ name, ok, message });
}

function checkFlexSchema() {
  try {
    const flexPath = path.resolve('apps/bot/flex/sample.json');
    const raw = fs.readFileSync(flexPath, 'utf8');
    const json = JSON.parse(raw);
    const ok =
      json.type === 'bubble' &&
      json.hero?.type === 'image' &&
      json.body?.type === 'box' &&
      Array.isArray(json.body?.contents) && json.body.contents.length > 0 &&
      json.footer?.type === 'box';
    checks.push({ name: 'Flex JSON', ok, message: ok ? '通過' : '缺少必要欄位' });
  } catch (err) {
    checks.push({ name: 'Flex JSON', ok: false, message: err.message });
  }
}

function checkRichMenuSchema() {
  try {
    const menuPath = path.resolve('apps/bot/richmenu/menu.json');
    const raw = fs.readFileSync(menuPath, 'utf8');
    const json = JSON.parse(raw);
    const ok =
      json.size?.width === 2500 &&
      json.size?.height === 843 &&
      Array.isArray(json.areas) && json.areas.length >= 3;
    checks.push({ name: 'Rich Menu JSON', ok, message: ok ? '通過' : '結構不完整' });
  } catch (err) {
    checks.push({ name: 'Rich Menu JSON', ok: false, message: err.message });
  }
}

(async () => {
  const providedFrontUrl = process.env.FRONT_URL ? process.env.FRONT_URL.trim() : null;
  const frontBase = process.env.VERCEL_URL
    ? process.env.VERCEL_URL.replace(/\/$/, '')
    : 'http://localhost:5173';
  const frontUrl = providedFrontUrl ?? `${frontBase}${frontBase.endsWith('/health') ? '' : '/health'}`;
  const frontLabel = providedFrontUrl
    ? '前端 (自訂 URL)'
    : process.env.VERCEL_URL
      ? '前端 (Vercel)'
      : '前端 (本地 5173)';
  const botUrl = process.env.BOT_URL ? process.env.BOT_URL.trim() : 'http://localhost:3000/health';

  await checkHttp(frontLabel, frontUrl, 'OK LIFF');

  await delay(50);
  const botLabel = process.env.BOT_URL ? 'Bot (自訂 URL)' : 'Bot (本地 3000)';
  await checkHttp(botLabel, botUrl, 'OK BOT');
  checkFlexSchema();
  checkRichMenuSchema();

  const allOk = checks.every((item) => item.ok);
  console.log('================ 健康檢查結果 ================');
  for (const item of checks) {
    console.log(`${item.ok ? '✅' : '❌'} ${item.name} → ${item.message}`);
  }
  console.log('============================================');

  process.exit(allOk ? 0 : 1);
})();
