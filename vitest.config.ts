import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@ionic\/core\/components$/,
        replacement: '@ionic/core/components/index.js',
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/testing/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.routes.ts',
        '**/*.html',
        '**/environment*.ts',
        'src/app/main.ts',
        'src/testing/**/*',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
