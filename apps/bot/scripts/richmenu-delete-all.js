#!/usr/bin/env node
import { getClient, printDryRun } from './richmenu-utils.js';

const dryRun = process.argv.includes('--dry-run');

async function run() {
  const { dryRun: isDry, client, reason } = getClient(dryRun);
  if (isDry) {
    printDryRun(reason ?? 'Rich Menu delete all');
    return;
  }

  try {
    const menus = await client.getRichMenuList();
    if (!menus.length) {
      console.log('[richmenu-delete-all] 沒有可刪除的 Rich Menu');
      return;
    }
    for (const menu of menus) {
      await client.deleteRichMenu(menu.richMenuId);
      console.log('[richmenu-delete-all] 已刪除：', menu.richMenuId);
    }
  } catch (err) {
    console.error('[richmenu-delete-all] 刪除失敗：', err.message);
    process.exitCode = 1;
  }
}

run();
