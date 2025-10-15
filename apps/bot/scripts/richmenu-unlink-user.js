#!/usr/bin/env node
import { getClient, printDryRun } from './richmenu-utils.js';

const userId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

async function run() {
  if (!userId) {
    console.error('用法：node scripts/richmenu-unlink-user.js <USER_ID> [--dry-run]');
    process.exit(1);
  }

  const { dryRun: isDry, client, reason } = getClient(dryRun);
  if (isDry) {
    printDryRun(reason ?? 'Rich Menu unlink user', { userId });
    return;
  }

  try {
    await client.unlinkRichMenuFromUser(userId);
    console.log('[richmenu-unlink-user] 解除綁定成功：', userId);
  } catch (err) {
    console.error('[richmenu-unlink-user] 解除綁定失敗：', err.message);
    process.exitCode = 1;
  }
}

run();
