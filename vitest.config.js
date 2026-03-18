import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 50,
        lines: 60
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.js',
        'vitest.config.js',
        'tailwind.config.js',
        'postcss.config.js'
      ]
    }
  }
});
