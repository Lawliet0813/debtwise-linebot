## 變更內容

- [ ] 說明此次調整的目標與影響

## 統一部署檢查

- [ ] Render 建置指令已設定為 `npm ci && npm run build`
- [ ] Render 啟動指令已設定為 `npm run start`
- [ ] LINE Bot 與 LIFF 前端共用同一個服務

## 驗收清單

- [ ] `npm run test` 全數通過
- [ ] `npm run build` 成功產出 `apps/bot/public`
- [ ] 本地 `npm run start` 後 `/` 與 `/health` 回應正常
- [ ] `/webhook` 行為符合預期
- [ ] Render Preview Deploy Hook 已觸發
- [ ] （可選）PR 留言已附上 `PREVIEW_URL`
