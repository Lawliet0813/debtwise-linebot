💰 DebtWise AI for LINE

Smart Debt Management Chatbot — 在 LINE 中直接管理債務、紀錄還款、生成策略、接收提醒。
此專案將 DebtWise AI 與 LINE Messaging API 結合，讓理財管理更輕鬆。

⸻

🚀 功能概覽
	•	/add 新增債務（含利率、到期日、最低繳款）
	•	/list 顯示債務清單與總覽（支援 Flex 卡片）
	•	/pay 紀錄還款金額與備註
	•	/plan 生成「雪球法」或「雪崩法」還款策略
	•	自動推播「到期提醒」、「月度報表」
	•	可擴充至 LIFF 表單與 Google Sheets 匯出

⸻

🧩 系統架構

LINE User
   ↓
LINE Messaging API
   ↓ Webhook
Express.js Server
   ├─ Command Router (/add, /list, /plan, /pay)
   ├─ Strategy Engine (Avalanche / Snowball)
   ├─ Flex Message Generator
   ├─ Supabase Client
   └─ Cron Job (每日提醒)
   ↓
Supabase (Postgres)


⸻

🛠️ 技術堆疊

類別	技術
Backend	Node.js + Express
Chat Platform	LINE Messaging API
Database	Supabase (Postgres)
Scheduler	node-cron / Supabase Edge Functions
Deploy	Render / Cloud Run
Report	Google Sheets API (optional)


⸻

📦 安裝與執行

1️⃣ 先決條件
	•	Node.js 18+
	•	npm
	•	ngrok（用於測試 Webhook）
	•	LINE 官方帳號 + Messaging API channel
	•	Supabase 專案（取得 URL 與 anon key）

2️⃣ 安裝專案

git clone https://github.com/<your-username>/debtwise-linebot.git
cd debtwise-linebot
npm install
cp .env.example .env

3️⃣ 編輯 .env

CHANNEL_ACCESS_TOKEN=你的_LINE_Token
CHANNEL_SECRET=你的_LINE_Secret
SUPABASE_URL=你的_Supabase_URL
SUPABASE_KEY=你的_Supabase_Key
PORT=3000

4️⃣ 啟動伺服器

npm run dev

5️⃣ 開啟 ngrok

ngrok http 3000

將 ngrok HTTPS URL 登錄到 LINE Developer Console → Messaging API → Webhook URL。
傳訊息給 Bot，應收到「DebtWise AI 已啟動 ✅」。

⸻

💡 常用指令

指令	功能	範例
/add	新增債務	/add 卡費 50000 14.9% d=25 min=1500
/list	顯示債務清單	/list
/pay	紀錄還款	/pay 卡費 3000 10/25
/plan	生成還款策略	/plan 20000 雪崩
/help	顯示指令說明	/help


⸻

🧠 策略引擎邏輯

雪崩法 (Avalanche)：優先償還利率最高的債務，節省利息。
雪球法 (Snowball)：優先償還金額最小的債務，建立成就感。

⸻

🧾 資料表結構（Supabase）

Table	主要欄位
users	line_user_id, name, created_at
debts	user_id, name, balance, interest_rate, min_payment, due_day
payments	debt_id, amount, date, note
plans	user_id, method, monthly_budget, generated_plan


⸻

🔔 自動推播
	•	每日 21:00 推播「明日應繳款」
	•	到期前三天自動提醒
	•	每週一推播「本週債務總覽」

⸻

☁️ 佈署建議

Render（最簡易）
	•	Build Command: npm install
	•	Start Command: node server.js

Cloud Run（進階）

gcloud builds submit --tag gcr.io/<project-id>/debtwise-linebot
gcloud run deploy debtwise-linebot --image gcr.io/<project-id>/debtwise-linebot --platform managed


⸻

📜 授權

本專案採用 MIT License，歡迎自由使用與修改。

⸻

🧭 開發路線圖
	•	LINE Webhook 基礎
	•	Supabase CRUD
	•	Flex 卡片展示
	•	策略引擎
	•	自動推播
	•	LIFF 表單
	•	報表匯出

⸻

