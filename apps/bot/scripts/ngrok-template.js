#!/usr/bin/env node
import { execSync } from 'child_process';

const port = process.env.PORT ?? 3000;
console.log('啟動 ngrok 隧道...');
console.log('若未安裝 ngrok，請先執行 `npm install -g ngrok`。');

try {
  execSync(`ngrok http ${port}`, { stdio: 'inherit' });
} catch (err) {
  console.log('\nngrok 尚未啟動或遭取消。啟動後請將 Forwarding URL 設為 LINE Webhook：');
  console.log('Messaging API → Webhook URL: https://<ngrok-domain>/webhook');
  console.log('並於 LINE Developers 後台驗證。');
}
