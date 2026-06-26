import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// The QTI sample items live in the repo-root `public/` folder. Point Vite's
// publicDir there so `/qti/kennisnet/ITEM001.xml` (and the assets the items
// reference, e.g. images) resolve at runtime.
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

export default defineConfig({
  publicDir,
  build: {
    target: 'esnext',
  },
  resolve: {
    // The QTI interaction edit components are Lit elements; dedupe Lit so a
    // single instance is used across the app and the workspace packages.
    dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
  },
  plugins: [
    tsconfigPaths({ projects: ['../../tsconfig.json'], ignoreConfigErrors: true }),
    {
      name: 'watch-node-modules',
      handleHotUpdate({ file, server }) {
        if (
          file.includes('node_modules/@qti-components/') ||
          file.includes('node_modules/@citolab/') ||
          file.includes('node_modules/@qti-editor/')
        ) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      '@qti-components/associate-interaction',
      '@qti-components/base',
      '@qti-components/choice-interaction',
      '@qti-components/extended-text-interaction',
      '@qti-components/hottext-interaction',
      '@qti-components/inline-choice-interaction',
      '@qti-components/interactions',
      '@qti-components/interactions-core',
      '@qti-components/match-interaction',
      '@qti-components/order-interaction',
      '@qti-components/text-entry-interaction',
      '@qti-components/theme',
      '@qti-components/transformers',
      '@qti-components/utilities',
      '@citolab/prose-qti/components/shared',
      '@citolab/prose-qti/components/choice',
      '@citolab/prose-qti/components/extended-text',
      '@citolab/prose-qti/components/text-entry',
      '@citolab/prose-qti/components/rubric-block',
      '@citolab/prose-extensions/prosemirror',
      '@citolab/prose-qti/qti3-item-import',
      '@citolab/prose-qti/core',
    ],
    force: true,
  },
  server: {
    port: 5175,
    fs: {
      allow: [workspaceRoot],
    },
    watch: {
      ignored: ['!**/node_modules/@qti-components/**', '!**/node_modules/@qti-editor/**'],
      usePolling: true,
      interval: 100,
    },
  },
});
