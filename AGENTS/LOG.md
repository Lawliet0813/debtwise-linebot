# 執行紀錄

2025-10-15T02:42:23Z - Task 0 Workspace 初始化：建立 npm workspaces 結構、placeholder scripts、安裝依賴並驗證 npm run dev。
2025-10-15T05:15:49Z - Task 1 LIFF 前端：建立 Vite+React+Tailwind 專案、整合 LIFF 初始化、路由與健康檢查，完成 build 驗證（dev 指令在沙箱無法開放 port）。
2025-10-15T05:23:29Z - Task 2 Bot Webhook：建立 Express webhook、Flex 範本、Rich Menu 腳本與測試（HTTP 測試預設跳過需設定 ENABLE_HTTP_TESTS=true）。
2025-10-15T08:23:13Z - Task 3 Flex/Rich Menu：輸出 sample Flex、Rich Menu JSON 與 create/upload/link 腳本，支援 dry-run。
2025-10-15T11:26:54Z - Task 4 測試與型別：導入 Vitest + Testing Library，Liff/Bot 測試皆通過（HTTP 測試預設可透過 ENABLE_HTTP_TESTS 啟用）。
2025-10-15T11:29:02Z - Task 5 CI：建立 GitHub Actions (Node 18/20/22) 跑 build 與 test。
2025-10-15T11:35:34Z - Task 6 部署設定：更新 infra/README、root README，整理 Vercel 與 ngrok/LINE 設定步驟。
2025-10-15T11:39:14Z - Task 7 安全與後端：新增 /api/verify-idtoken 與 LIFF 前端 dashboard 呼叫流程，提醒正式環境需驗證簽章。
2025-10-15T11:44:42Z - Task 8 一鍵腳本：實作 setup/auto-run 腳本、維護 ngrok 與 Flex 產生流程。
2025-10-15T12:19:19Z - Task 6 Deployment Extension：已建立 Vercel 指令模板與 deploy:vercel scripts。
2025-10-15T12:19:29Z - Task 7 Deployment Extension：已輸出 ngrok 指令模板並補充 Render/Railway 環境變數指引。
2025-10-15T12:19:41Z - Task 8 Deployment Extension：Rich Menu 腳本支援 dry-run（建立/link/unlink/delete）。
2025-10-15T12:30:02Z - Task 9 Deployment Extension：執行 health-check 指令模板，提供前後端/Flex/Rich Menu 驗證。
2025-10-15T12:30:13Z - Task 10 Deployment Extension：新增 Vercel deploy workflow 與 GitHub Secrets 教學。
2025-10-15T12:30:22Z - Final Summary：Vercel 指令與自動部署完成，ngrok/Rich Menu 腳本支援 dry-run，health-check 提供前後端/Flex/Rich Menu 驗證，CI + deploy workflow 就緒。
2025-10-15T16:11:33Z - Health Check: 前端/後端未啟動（fetch failed），Flex & Rich Menu JSON 通過。
2025-10-15T17:38:36Z - Health Check (FRONT_URL=https://liff-o1hccpt3o-lawliets-projects-48279a7c.vercel.app/health.txt): 前端/後端 fetch failed (可能無法連線)，Flex & Rich Menu JSON 通過。
2025-10-15T17:53:21Z - Security: /api/verify-idtoken 改為使用 LINE OpenID 公鑰（jose），新增 LINE_CHANNEL_ID 環境需求並更新測試。
2025-10-15T17:58:12Z - Auth: 導入 jose 驗證 LINE ID Token，新增 LOGIN_CHANNEL_ID/LOGIN_ISSUER 並更新測試覆蓋。
2025-10-15T18:31:15Z - Patch: 更新 LINE_CHANNEL_SECRET、調整 webhook handler，新增 ngrok 指令 (bot:ngrok)。
