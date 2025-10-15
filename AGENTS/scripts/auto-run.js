#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const todoPath = path.resolve(projectRoot, 'AGENTS/TODO.md');
const logPath = path.resolve(projectRoot, 'AGENTS/LOG.md');

const todo = fs.readFileSync(todoPath, 'utf-8').split(/\r?\n/);
const pendingIndex = todo.findIndex((line) => /^- \[ \] Task/.test(line));

if (pendingIndex === -1) {
  console.log('[auto-run] 所有任務皆已完成 ✅');
  process.exit(0);
}

const pendingLine = todo[pendingIndex];
const taskMatch = pendingLine.match(/Task\s(\d+)/);
if (!taskMatch) {
  console.log('[auto-run] 找不到任務編號，請手動處理。');
  process.exit(1);
}

const taskNumber = taskMatch[1];
const command = commandForTask(taskNumber);

if (!command) {
  console.log(`[auto-run] Task ${taskNumber} 暫無自動腳本，請手動完成。`);
  process.exit(0);
}

console.log(`[auto-run] 執行 Task ${taskNumber} 指令：${command}`);

try {
  execSync(command, { cwd: projectRoot, stdio: 'inherit' });
  todo[pendingIndex] = pendingLine.replace('[ ]', '[x]').replace('(Next)', '(Auto)');
  fs.writeFileSync(todoPath, todo.join('\n'));
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `${timestamp} - auto-run 完成 Task ${taskNumber}，指令：${command}\n`);
  console.log('[auto-run] 任務已更新為完成。');
} catch (err) {
  console.error('[auto-run] 執行失敗：', err.message);
  console.error('[auto-run] 請修復後再試一次。');
  process.exit(1);
}

function commandForTask(taskNumber) {
  const mapping = {
    '4': 'npm run test',
    '5': 'npm run build',
    '6': 'npm run build --workspace apps/liff-app',
    '7': 'npm --workspace apps/bot run test',
    '8': 'npm run dev',
  };
  return mapping[taskNumber];
}
