# DebtWise LINE Bot

DebtWise 是一個以 Node.js 實作的 LINE Webhook 伺服器，提供債務紀錄、還款追蹤與還款計畫等功能。

## 需求條件

- Node.js 18 或以上版本
- LINE Messaging API Channel（需取得 Channel access token 與 Channel secret）

## 專案初始化

1. 安裝依賴：
   ```bash
   npm install
   ```
2. 建立環境設定：
   ```bash
   cp .env.example .env
   ```
3. 於 `.env` 填入 LINE 與 Supabase 所需環境變數（僅需 anon key）。

## 指令一覽

- `/add 名稱 金額 利率% d=到期日 [min=最低還款]`：新增債務並儲存於 Supabase。
- `/list`：以文字＋Flex Carousel 顯示債務、已還金額與剩餘餘額。
- `/pay 名稱 金額 [YYYY-MM-DD] [備註]`：記錄單筆還款，並自動更新清單。
- `/plan 月預算 [雪球|雪崩]`：依雪球或雪崩法計算還款計畫，輸出摘要與 Flex 卡片。

快速回覆列提供常用指令範例，可直接點選發送。

## 執行與測試

- 啟動開發伺服器：
  ```bash
  npm run dev
  ```
- 健康檢查：`GET /health` 會回傳 `{ ok: true, version }`。
- 執行測試：
  ```bash
  npm test
  ```

伺服器預設監聽 `.env` 指定的 `PORT`（未設定則為 `3000`），Webhook 入口為 `POST /webhook`。

## 截圖（占位）

> 待補：Flex 清單與還款計畫截圖。
