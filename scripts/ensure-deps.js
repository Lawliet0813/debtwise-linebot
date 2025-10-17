#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checks = [
  'node_modules/tailwindcss/package.json',
  'node_modules/vite/package.json',
  'node_modules/react/package.json',
];

const missing = checks.filter((relativePath) => !existsSync(path.join(root, relativePath)));

if (missing.length === 0) {
  process.exit(0);
}

console.log('[ensure-deps] Missing dependencies detected:');
for (const entry of missing) {
  console.log(` - ${entry}`);
}
console.log('[ensure-deps] Running npm install to restore workspace dependencies...');

execSync('npm install', { stdio: 'inherit' });

