#!/usr/bin/env node
import fs from 'node:fs';
import { getClient, getImagePath, readLastRichMenuId, printDryRun } from './richmenu-utils.js';

const richMenuIdArg = process.argv[2];
const imageArg = process.argv[3];
const dryRun = process.argv.includes('--dry-run');

async function run() {
  const richMenuId = richMenuIdArg || readLastRichMenuId();
  if (!richMenuId) {
    console.error('請提供 Rich Menu ID：node scripts/richmenu-upload-image.js <RICH_MENU_ID> [IMAGE_PATH] [--dry-run]');
    process.exit(1);
  }

  let imagePath;
  try {
    imagePath = getImagePath(imageArg);
  } catch (err) {
    console.error('[richmenu-upload-image] ' + err.message);
    process.exit(1);
  }

  const { dryRun: isDry, client, reason } = getClient(dryRun);
  if (isDry) {
    printDryRun(reason ?? 'Rich Menu upload image', { richMenuId, imagePath });
    return;
  }

  try {
    const stream = fs.createReadStream(imagePath);
    await client.setRichMenuImage(richMenuId, stream);
    console.log('[richmenu-upload-image] 上傳成功：', richMenuId);
  } catch (err) {
    console.error('[richmenu-upload-image] 上傳失敗：', err.message);
    process.exitCode = 1;
  }
}

run();
