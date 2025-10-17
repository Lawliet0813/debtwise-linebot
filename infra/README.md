# Render 部署指南

## 單一 Web Service

1. **Build Command**：`npm ci && npm run build`
2. **Start Command**：`npm run start`
3. **Environment Variables**
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `VITE_LIFF_ID`（或 `LOGIN_CHANNEL_ID`）
   - `PORT`（預設 3000，可依 Render 需求調整）
4. **健康檢查**：設定 `GET /health`，狀態碼 200 代表服務正常。

部署完成後，前端 LIFF 與 LINE Bot Webhook 會由相同的 Node.js 服務提供。

## Render Preview Deploy Hook

- 於 GitHub Secrets 設定 `RENDER_PREVIEW_HOOK`（必填）與 `PREVIEW_URL`（選填，固定預覽網址）。
- 每次 Pull Request 會自動執行 CI，並觸發 Deploy Hook 部署預覽環境。
- Workflow 會在 PR 留言顯示預覽狀態與驗證步驟：
  - `GET /health` 回傳 200
  - 首頁與 SPA 路由載入正常

如需臨時測試，可使用 `npm run bot:ngrok` 建立暫時 URL。
