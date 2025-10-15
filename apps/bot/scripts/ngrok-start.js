#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const port = process.env.PORT ?? 3000;
const check = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ngrok'], {
  encoding: 'utf-8',
});

const hasNgrok = check.status === 0;

console.log('================ ngrok Webhook 指南 ================');
if (!hasNgrok) {
  console.log('⚠️  檢測到系統尚未安裝 ngrok，請先執行：');
  console.log('    npm install -g ngrok');
  console.log('----------------------------------------------------');
}

console.log('1) 啟動隧道（於專案根目錄或任何位置執行）：');
console.log(`   ngrok http ${port}`);
console.log('2) 取得 Forwarding HTTPS URL，填入 LINE Developers → Messaging API → Webhook URL');
console.log('   例如：https://<your-subdomain>.ngrok.io/webhook');
console.log('3) 更新 Webhook 後，於後台按「Verify」確認連線成功。');
console.log('4) 可使用以下 curl 指令模擬事件：');
console.log('   curl -X POST "$NGROK_URL/webhook" \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"events":[{"replyToken":"test","type":"message","message":{"type":"text","text":"開啟儀表板"}}]}\'');
console.log('5) 若需停止隧道，於 ngrok 視窗按 Ctrl+C。');
console.log('====================================================');

console.log('補充：可於 README 的部署章節參考 Render / Railway 正式部署流程。');
