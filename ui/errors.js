export const errorTexts = {
  emptyCommand: () => '請輸入指令，例如 /add 或 /list。',
  missingSlash: () => '指令需以 / 開頭，請再試一次 🙏',
  unsupportedCommand: (command) => `不支援的指令：${command}。輸入 /help 查看完整指令列表。`,
  missingUser: () => '無法取得使用者識別資訊，請稍後再試 🙏',
  noDebts: () => '目前沒有債務紀錄，輸入 /add 開始新增吧！',
  debtExists: (name) => `「${name}」已存在，請換個名稱或使用 /list 查詢。`,
  debtNotFound: (name) => `找不到債務「${name}」，請確認名稱是否正確。`,
  systemBusy: () => '系統忙碌中，請稍後再試 🙏',
  rateLimited: () => '操作太頻繁，請稍後再試 🙏',
  budgetTooLow: () => '月預算不足以支付所有債務的最低繳款額，請調整金額。',
  allCleared: () => '所有債務都已結清，太棒了！',
};

export function withError(message) {
  return {
    text: message,
  };
}
