# LINE-LIFF-Auto Monorepo

整合 LINE Messaging API Bot 與 LIFF 前端的多模專案，支援一鍵啟動、測試、部署到 Vercel，並提供 Rich Menu / Flex 產生腳本與自動化代理流程。

## 專案結構

```
.
├─ apps/
│  ├─ liff-app/            # React + Vite + Tailwind + LIFF 前端
│  └─ bot/                 # Node + Express Webhook 伺服器
├─ infra/
│  ├─ vercel.json          # Vercel build 設定
│  └─ README.md            # 部署指南
├─ AGENTS/                 # 自動化代理腳本、TODO、LOG
├─ .github/workflows/ci.yml# GitHub Actions（Node 18/20/22）
├─ package.json            # npm workspaces 與全域指令
├─ pnpm-lock 封鎖: 無（採 npm）
└─ .env.example            # 環境變數樣板
```

## 安裝與本機開發

```bash
npm install
npm run dev       # 併發啟動 LIFF 與 Bot（需於各自 workspace 設定 .env.local）
```

> **注意**：沙箱環境禁止開放埠口，`npm run dev` 於本地端可正常啟動；在 CI 或沙箱測試時僅需確認 build / test。

### 工作區指令

| 指令 | 說明 |
| ---- | ---- |
| `npm run dev` | 併發啟動 `dev:liff` 與 `dev:bot` |
| `npm run build` | 併發執行前、後端 build |
| `npm run test` | 併發執行前、後端測試（bot HTTP 測試預設跳過，可設 `ENABLE_HTTP_TESTS=true` 啟用） |
| `npm run bot:ngrok` | 顯示 ngrok 隧道啟動與 Webhook 設定指引 |
| `npm run richmenu:create` | 以 dry-run 模式建立 Rich Menu payload |
| `npm run richmenu:upload` | Dry-run：顯示圖片上傳請求 |
| `npm run richmenu:link` / `:unlink` | Dry-run：綁定或解除使用者與 Rich Menu |
| `npm run richmenu:delete:all` | Dry-run：列出並刪除所有 Rich Menu |
| `npm run health` | 健康檢查腳本（前端/後端/Flex/Rich Menu） |
| `npm run deploy:vercel[:*]` | Vercel CLI 模板（link / env / deploy） |
| `npm run setup` | 自動化初始設定腳本（建立 .env.local、Flex 範本等） |
| `npm run auto` | 自動代理流程（詳見 `AGENTS/AGENT.md`） |

## 環境變數

根目錄 `.env.example`：

```
# LIFF
VITE_LIFF_ID=REPLACE_WITH_YOUR_LIFF_ID

# LINE Messaging API (bot)
LINE_CHANNEL_ACCESS_TOKEN=REPLACE_WITH_LONG_TOKEN
LINE_CHANNEL_SECRET=REPLACE_WITH_SECRET

# App
APP_BASE_URL=https://your-domain.example
BOT_BASE_URL=https://your-bot.example
PORT=3000
```

請分別複製至：

- `apps/liff-app/.env.local`
- `apps/bot/.env.local`

### LIFF App
- `VITE_LIFF_ID`：LINE Developers → LIFF → LIFF ID

### Bot Server
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`：Messaging API 基本設定
- `LINE_CHANNEL_ID`：與 Channel access token 配對的 Channel ID（用於驗證 LIFF ID Token）
- `VITE_LIFF_ID`：供 Flex 按鈕導引至 LIFF URL
- `PORT`：預設 3000，可依部署平臺調整

## 功能總覽

- `/health`（前端 `/health` → `OK LIFF`、後端 `/health` → `OK BOT`）
- `/webhook`：處理 LINE push events，當收到「開啟儀表板」回傳 Flex Bubble；其它訊息回覆指引文字
- `/flex/sample`：回傳 Flex 範本 JSON
- `/api/verify-idtoken`：預留 LIFF ID Token 驗證端點（待 Task 7 擴充）

## 測試

- LIFF：Vitest + Testing Library（jsdom）
- Bot：Vitest + Supertest（HTTP 測試預設 skip，可於本機 `ENABLE_HTTP_TESTS=true npm --workspace apps/bot run test`）
- 根指令 `npm run test` 同步執行兩側測試

## Rich Menu 與 Flex 工具

| 腳本 | 說明 |
| ---- | ---- |
| `npm --workspace apps/bot run flex-generate` | 產生 / 覆寫 `apps/bot/flex/sample.json` |
| `node apps/bot/scripts/richmenu-create.js [--dry-run]` | 建立 Rich Menu，預設若無 token 則 Dry Run |
| `node apps/bot/scripts/richmenu-upload-image.js <RICH_MENU_ID> <IMAGE_PATH> [--dry-run]` | 上傳 Rich Menu 圖片 |
| `node apps/bot/scripts/richmenu-link-user.js <USER_ID> <RICH_MENU_ID> [--dry-run]` | 綁定 Rich Menu 至指定 user |
| `npm run bot:ngrok` | 啟動 ngrok 隧道並顯示 webhook 設定提示 |

## 部署

### Vercel（LIFF 前端）
1. `npm i -g vercel`
2. `npm run deploy:vercel:link`（或手動 `vercel link --yes`）
3. `npm run deploy:vercel:env` → 選擇 `VITE_LIFF_ID` 並填入正式 LIFF ID
4. `npm run deploy:vercel` 或 `vercel deploy --prod`

> Build Command：`npm --workspace apps/liff-app run build`
  Output Directory：`apps/liff-app/dist`

### Bot 暫時部署（ngrok）
1. `npm i -g ngrok`（首次安裝）
2. `npm run bot:ngrok` 取得啟動指令與 LINE Webhook 設定教學
3. 將 `https://<隧道>/webhook` 填入 Messaging API → Webhook URL，並使用範例 curl 測試

### Bot 正式部署模板（Render / Railway 等）
- 需設定環境變數：`LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `VITE_LIFF_ID`, `PORT`
- 入口指令：`npm --workspace apps/bot run dev`（開發）或自行建立啟動腳本
- 可參考 `infra/README.md` 了解更多部署細節

### GitHub Secrets 設定（Vercel 自動部署）
1. 於本機登入 Vercel，使用 CLI 取得必要資訊：
   ```bash
   vercel projects ls       # 查詢 PROJECT_ID
   vercel whoami            # 檢查帳戶（ORG_ID 可由 CLI or 控制台取得）
   ```
2. 於 GitHub Repository → Settings → Secrets and variables → Actions 建立：
   - `VERCEL_TOKEN`：`vercel login` 後使用 `vercel -t <token>` 取得
   - `VERCEL_ORG_ID`：可至 Vercel 控制台或 API 查詢
   - `VERCEL_PROJECT_ID`：對應 apps/liff-app 的專案 ID
3. 完成後，push 到 main 會觸發 `.github/workflows/deploy.yml` 自動部署。

## LINE Developers 設定指引

1. **Messaging API**
   - 於後台啟用 Webhook，URL 指向：`https://<部署網址>/webhook`
   - 同步設定 Channel access token / secret。
2. **LIFF**
   - 新增 LIFF App，Endpoint URL 指向 Vercel 部署網址。
   - 取得 LIFF ID 後填入 `.env` 與 LINE Flex / Rich Menu URI。
3. **權限需求**：`profile`, `openid`。

## 自動化代理

`AGENTS/TODO.md` 追蹤各 Task 完成狀態，`AGENTS/LOG.md` 記錄操作摘要。執行 `npm run auto` 可依序處理待辦（後續可擴充）。

## 注意事項

- Bot 測試中 HTTP 部分預設跳過，避免在受限環境綁定埠口；若於本機需完整測試，可設 `ENABLE_HTTP_TESTS=true`。
- 任何 Rich Menu / Flex 腳本於未填入 token 時皆以 Dry Run 輸出 payload，避免誤呼叫 LINE API。
