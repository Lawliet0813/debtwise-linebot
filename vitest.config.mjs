import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  cacheDir: resolve(rootDir, 'node_modules/.vitest'),
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
  },
});
