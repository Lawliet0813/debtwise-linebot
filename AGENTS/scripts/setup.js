#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const tasks = [];

ensureFile('.env', path.resolve(projectRoot, '.env.example'));
ensureFile('apps/liff-app/.env.local', path.resolve(projectRoot, 'apps/liff-app/.env.local.example'));
ensureFile('apps/bot/.env.local', path.resolve(projectRoot, 'apps/bot/.env.local.example'));

tasks.push(runFlexGenerator());

console.log('[setup] 檢查完成，請確認 .env/.env.local 內容後再啟動專案。');
console.log('[setup] 完成事項：', tasks.filter(Boolean).join('、'));

function ensureFile(targetRelative, templatePath) {
  const targetPath = path.resolve(projectRoot, targetRelative);
  if (fs.existsSync(targetPath)) {
    return;
  }
  if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(targetPath, '', 'utf-8');
    console.log(`[setup] 已建立 ${targetRelative}（空白檔案，請手動填寫）`);
    return;
  }
  fs.copyFileSync(templatePath, targetPath);
  console.log(`[setup] 已複製 ${targetRelative} ← ${path.relative(projectRoot, templatePath)}`);
}

function runFlexGenerator() {
  try {
    execSync('node apps/bot/scripts/flex-generate.js', { cwd: projectRoot, stdio: 'inherit' });
    return '產生 Flex 範本';
  } catch (err) {
    console.warn('[setup] flex-generate.js 執行失敗：', err.message);
    return 'Flex 範本產生失敗（請手動執行）';
  }
}
