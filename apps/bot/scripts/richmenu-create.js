#!/usr/bin/env node
import { resolveMenuJson, getClient, rememberRichMenuId, printDryRun } from './richmenu-utils.js';

const dryRun = process.argv.includes('--dry-run');

async function run() {
  const menu = resolveMenuJson();
  const { dryRun: isDry, client, reason } = getClient(dryRun);

  if (isDry) {
    printDryRun(reason ?? 'Rich Menu create', menu);
    return;
  }

  try {
    const richMenuId = await client.createRichMenu(menu);
    console.log('[richmenu-create] 建立成功：', richMenuId);
    rememberRichMenuId(richMenuId);
  } catch (err) {
    console.error('[richmenu-create] 建立失敗：', err.message);
    process.exitCode = 1;
  }
}

run();
