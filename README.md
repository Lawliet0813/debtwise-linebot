# LINE-LIFF-Auto Monorepo

整合 LINE Messaging API Bot 與 LIFF 前端的多模專案，支援一鍵啟動、測試，並透過 Render 部署為單一 Node.js 服務，同時提供 Rich Menu / Flex 產生腳本與自動化代理流程。

## 專案結構

```
.
├─ apps/
│  ├─ liff-app/            # React + Vite + Tailwind + LIFF 前端
│  └─ bot/                 # Node + Express Webhook 伺服器
├─ infra/
│  └─ README.md            # 部署指南
├─ AGENTS/                 # 自動化代理腳本、TODO、LOG
├─ .github/workflows/ci-render-preview.yml # GitHub Actions（CI + Render Preview）
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
| `npm run build` | 建置 LIFF 並輸出至 `apps/bot/public` |
| `npm run test` | 併發執行前、後端測試（bot HTTP 測試預設跳過，可設 `ENABLE_HTTP_TESTS=true` 啟用） |
| `npm run bot:ngrok` | 顯示 ngrok 隧道啟動與 Webhook 設定指引 |
| `npm run richmenu:create` | 以 dry-run 模式建立 Rich Menu payload |
| `npm run richmenu:upload` | Dry-run：顯示圖片上傳請求 |
| `npm run richmenu:link` / `:unlink` | Dry-run：綁定或解除使用者與 Rich Menu |
| `npm run richmenu:delete:all` | Dry-run：列出並刪除所有 Rich Menu |
| `npm run health` | 健康檢查腳本（前端/後端/Flex/Rich Menu） |
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

- `/health`：單一服務的健康檢查（回傳 `{ ok: true }`）
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

### Render（正式環境）
1. 在 Render 建立 Web Service，連結此 Repository。
2. Build Command：`npm ci && npm run build`
3. Start Command：`npm run start`
4. 環境變數：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `VITE_LIFF_ID`（或 `LOGIN_CHANNEL_ID`）
   - `PORT`（Render 預設提供 `PORT`，可沿用）
5. 健康檢查：`GET /health`，成功回傳 `{ ok: true }` 即代表服務正常。

部署完成後，前端 LIFF 與 LINE Bot Webhook 會共用同一個 Node.js 服務，不需再維護兩套部署。

### Bot 暫時部署（ngrok）
1. `npm i -g ngrok`（首次安裝）
2. `npm run bot:ngrok` 取得啟動指令與 LINE Webhook 設定教學
3. 將 `https://<隧道>/webhook` 填入 Messaging API → Webhook URL，並使用範例 curl 測試
   > 開發時可使用 `DEBUG_TEST_MODE=1` 模式偵錯簽章驗證。

### GitHub Secrets 設定（Render Preview）
1. 至 GitHub Repository → Settings → Secrets and variables → Actions 建立：
   - `RENDER_PREVIEW_HOOK`：Render Deploy Hook URL（必填，用於自動觸發預覽部署）
   - `PREVIEW_URL`：預覽環境的固定網址（選填，Workflow 會在 PR 留言提供連結）
2. 建立 Pull Request 時，Workflow 會：
   - 安裝相依套件並執行 `npm run test`
   - 建置前端並確認輸出至 `apps/bot/public`
   - 觸發 Render Deploy Hook，於 PR 留言顯示預覽狀態與驗證步驟

## LINE Developers 設定指引

1. **Messaging API**
   - 於後台啟用 Webhook，URL 指向：`https://<部署網址>/webhook`
   - 同步設定 Channel access token / secret。
2. **LIFF**
   - 新增 LIFF App，Endpoint URL 指向 Render 部署網址。
   - 取得 LIFF ID 後填入 `.env` 與 LINE Flex / Rich Menu URI。
3. **權限需求**：`profile`, `openid`。

## 自動化代理

`AGENTS/TODO.md` 追蹤各 Task 完成狀態，`AGENTS/LOG.md` 記錄操作摘要。執行 `npm run auto` 可依序處理待辦（後續可擴充）。

## 注意事項

- Bot 測試中 HTTP 部分預設跳過，避免在受限環境綁定埠口；若於本機需完整測試，可設 `ENABLE_HTTP_TESTS=true`。
- 任何 Rich Menu / Flex 腳本於未填入 token 時皆以 Dry Run 輸出 payload，避免誤呼叫 LINE API。
