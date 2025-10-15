#!/usr/bin/env node
import { getClient, readLastRichMenuId, printDryRun } from './richmenu-utils.js';

const userId = process.argv[2];
const richMenuIdArg = process.argv[3];
const dryRun = process.argv.includes('--dry-run');

async function run() {
  if (!userId) {
    console.error('用法：node scripts/richmenu-link-user.js <USER_ID> [RICH_MENU_ID] [--dry-run]');
    process.exit(1);
  }

  const richMenuId = richMenuIdArg || readLastRichMenuId();
  if (!richMenuId) {
    console.error('找不到 Rich Menu ID，請輸入參數或先執行 richmenu-create。');
    process.exit(1);
  }

  const { dryRun: isDry, client, reason } = getClient(dryRun);
  if (isDry) {
    printDryRun(reason ?? 'Rich Menu link user', { userId, richMenuId });
    return;
  }

  try {
    await client.linkRichMenuToUser(userId, richMenuId);
    console.log('[richmenu-link-user] 綁定成功：', { userId, richMenuId });
  } catch (err) {
    console.error('[richmenu-link-user] 綁定失敗：', err.message);
    process.exitCode = 1;
  }
}

run();
