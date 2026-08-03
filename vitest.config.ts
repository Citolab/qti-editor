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
            // Off, or every failing run leaves PNGs in apps/e2e/stories/__screenshots__ and they
            // accumulate — including screenshots of file-snapshot tests, which are images of
            // nothing. 40 of them had built up, in directories named after test files that no
            // longer exist, and they were mistakable for VRT baselines. The real baselines live in
            // __vrt__ and are committed; nothing else on disk should look like one.
            screenshotFailures: false,
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
      /*
       * Visual-regression project: only stories tagged `vrt`, one screenshot each.
       *
       * Included ONLY under VRT=1 (i.e. `just screenshots` / `pnpm run test:vrt`, which then select
       * it with --project vrt). Two @storybook/addon-vitest projects sharing a configDir cannot run
       * in the same Vitest invocation — the plugin renames both to `storybook:<configDir>` and one
       * then fails to fetch the other's per-file setup module. So `just test` runs `storybook` only,
       * and VRT runs on its own. Same arrangement as QTI-Components, for the same reason.
       *
       * Annotated so the conditional spread does not widen the projects array and strip contextual
       * typing from the sibling project literals.
       */
      ...((process.env.VRT !== '1'
        ? []
        : [
            {
              extends: true,
              plugins: [
                storybookTest({
                  tags: { include: ['vrt'] },
                  configDir: path.join(dirname, '.storybook'),
                  storybookScript: 'pnpm run storybook -- --ci',
                }),
              ],
              test: {
                name: 'vrt',
                setupFiles: ['./.storybook/vitest.vrt.setup.ts'],
                // The project loads every story file in order to tag-filter (the Storybook plugin
                // ignores test.include), and an unrelated flaky story can throw "iframe reloaded
                // during a test". Only `vrt`-tagged stories actually run and assert, so don't let
                // that abort the run.
                dangerouslyIgnoreUnhandledErrors: true,
                globals: true,
                /*
                 * Capture one story at a time.
                 *
                 * In parallel, workers race over the same Storybook iframe and Vite's on-the-fly
                 * dependency optimization: roughly two thirds of the files died with "Vitest failed
                 * to find the runner" while the rest passed, and which ones varied per run. Serial,
                 * all 17 pass every time.
                 *
                 * Nothing is lost. The whole suite is 17 screenshots in ~5s, and a screenshot is
                 * timing-sensitive by nature — a capture that waits on fonts, images and three
                 * animation frames wants a quiet browser, not a contended one.
                 */
                fileParallelism: false,
                // Each capture mounts a ProseMirror editor and waits for images and fonts; give it
                // room beyond the stability loop.
                testTimeout: 40000,
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  // Wide enough that the editor container is never the constraint on layout, and
                  // deviceScaleFactor 2 to match a retina canvas — the same pair the runtime suite
                  // uses, so the two sets of images are comparable at a glance.
                  viewport: { width: 2560, height: 1440 },
                  screenshotFailures: false,
                  instances: [
                    { browser: 'chromium', provider: playwright({ contextOptions: { deviceScaleFactor: 2 } }) },
                  ],
                },
              },
            },
          ]) as any[]),
      {
        extends: true,
        test: {
          name: 'browser',
          // `schema/` is in here because the schema fixture gate lives there and must run through
          // Vite: building the real editor schema imports the real components, and those are built
          // for a bundler. The same check as a standalone tsx script died on a Vite-only stylesheet
          // specifier in a dependency's dist — see the header of content-model.browser.test.ts.
          include: [
            'packages/**/src/**/*.browser.test.ts',
            'apps/**/*.browser.test.ts',
            'schema/**/*.browser.test.ts'
          ],
          setupFiles: ['./tools/testing/setup/vitest.js'],
          globalSetup: ['./tools/testing/setup/vendor-qti-runtime.global.mjs'],
          browser: {
            enabled: true,
            // See the note on the `storybook` project above — failure screenshots are derived
            // artifacts and must not accumulate next to committed baselines.
            screenshotFailures: false,
            // Headed by default — Playwright opens a visible Chrome for Testing
            // window so the test author can watch the editor + runtime render.
            // CI / non-interactive runs override via `--browser.headless=true`.
            headless: true,
            viewport: { width: 1280, height: 800 },
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
