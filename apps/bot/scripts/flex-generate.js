#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

timeLog('開始產生 Flex 範本...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const flexDir = path.resolve(projectRoot, 'flex');
const outputPath = path.resolve(flexDir, 'sample.json');

mkdirSync(flexDir, { recursive: true });

const template = {
  type: 'bubble',
  hero: {
    type: 'image',
    url: 'https://your.cdn/banner.jpg',
    size: 'full',
    aspectRatio: '16:9',
    aspectMode: 'cover',
  },
  body: {
    type: 'box',
    layout: 'vertical',
    contents: [
      { type: 'text', text: '你的還款儀表板已就緒', weight: 'bold', size: 'lg' },
      { type: 'text', text: '點擊下方「開啟儀表板」查看個人化策略', wrap: true, margin: 'md' },
    ],
  },
  footer: {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    contents: [
      {
        type: 'button',
        style: 'primary',
        color: '#005BAC',
        action: {
          type: 'uri',
          label: '開啟儀表板',
          uri: 'https://liff.line.me/${VITE_LIFF_ID}',
        },
      },
    ],
  },
};

writeFileSync(outputPath, JSON.stringify(template, null, 2));

timeLog(`Flex 範本已輸出至 ${outputPath}`);

function timeLog(message) {
  console.log(`[flex-generate] ${message}`);
}
