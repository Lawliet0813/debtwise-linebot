# LINE-LIFF-Auto Monorepo

此專案將 LINE Bot 與 LIFF 前端整合於單一 Monorepo，支援自動化開發、測試與部署流程。專案仍在初始化階段，詳盡功能將在後續任務逐步完成。

## 結構

```
.
├─ apps/
│  ├─ liff-app/    # LIFF 前端
│  └─ bot/         # LINE Bot Webhook
├─ infra/
│  └─ vercel.json  # （預留）Vercel 部署設定
├─ AGENTS/         # 自動化代理設定、待辦與紀錄
└─ package.json    # npm workspaces 與根指令
```

## 快速開始

```bash
npm install
npm run dev
```

目前 `npm run dev` 會啟動前、後端的併發開發指令（暫以 placeholder 取代）。後續任務將逐步補齊實際開發伺服器與測試。

## 環境變數（預告）

正式環境將需要以下變數，並會在 Task 1 與 Task 2 中補充 `.env.example` 與 `.env.local` 指引：

```
VITE_LIFF_ID
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
APP_BASE_URL
BOT_BASE_URL
PORT
```

## 自動化代理

詳見 `AGENTS/AGENT.md`。可以透過以下指令啟動自動化流程（目前為占位腳本）：

```bash
npm run auto
```
