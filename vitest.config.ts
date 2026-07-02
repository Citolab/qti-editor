/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['tsconfig.json'],
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          include: ['packages/**/src/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
          exclude: ['**/node_modules/**', 'packages/**/src/**/*.browser.test.ts', 'apps/**/*.browser.test.ts'],
          setupFiles: ['./tools/testing/setup/vitest.js'],
          server: {
            deps: {
              inline: [/@qti-components\//],
            },
          },
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          exclude: ['**/node_modules/**'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['packages/**/src/**/*.browser.test.ts', 'apps/**/*.browser.test.ts'],
          setupFiles: ['./tools/testing/setup/vitest.js'],
          globalSetup: ['./tools/testing/setup/vendor-qti-runtime.global.mjs'],
          browser: {
            enabled: true,
            // Headed by default — Playwright opens a visible Chrome for Testing
            // window so the test author can watch the editor + runtime render.
            // CI / non-interactive runs override via `--browser.headless=true`.
            headless: false,
            viewport: { width: 1280, height: 800 },
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
