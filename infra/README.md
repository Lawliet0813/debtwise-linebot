# 部署指南

## Vercel（LIFF 前端）

1. 登入 Vercel，建立新專案並連結此 GitHub Repository。
2. Build Command：`npm --workspace apps/liff-app run build`
3. Output Directory：`apps/liff-app/dist`
4. 設定環境變數：
   - `VITE_LIFF_ID`：LINE Developers 取得的 LIFF ID
   - `APP_BASE_URL`：對外網址（選擇性，用於文件）
5. 部署完成後，記錄 Vercel 網域供 LINE LIFF 設定使用。

## Bot Webhook（Render / Fly.io / 自建伺服器）

- 建議於部署平台設定下列環境變數：
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CHANNEL_SECRET`
  - `VITE_LIFF_ID`
  - `PORT`（預設 3000）
- 若採自建主機，可配合 `apps/bot/scripts/ngrok-template.js` 快速開啟臨時隧道：
  ```bash
  npm run bot:ngrok
  ```
  取得的 https URL 可直接設定為 LINE Messaging API Webhook。

更多設定請參考專案根目錄 README。
