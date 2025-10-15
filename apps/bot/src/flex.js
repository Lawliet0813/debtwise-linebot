import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_PATH = path.resolve(__dirname, '../flex/sample.json');

export function loadDashboardFlex(liffId) {
  const raw = readFileSync(SAMPLE_PATH, 'utf-8');
  const template = JSON.parse(raw);
  const resolvedLiffId = liffId ?? '';
  const uri = `https://liff.line.me/${resolvedLiffId}`;

  const clone = structuredClone(template);
  const button = clone?.footer?.contents?.[0]?.action;
  if (button && typeof button === 'object') {
    button.uri = uri;
  }

  return clone;
}

export function getSampleFlex() {
  const raw = readFileSync(SAMPLE_PATH, 'utf-8');
  return JSON.parse(raw);
}
