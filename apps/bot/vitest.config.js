import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        'src/index.js', // Entry point, tested via integration
        'src/**/*.test.js',
        'src/**/*.spec.js',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      all: true,
    },
  },
});
