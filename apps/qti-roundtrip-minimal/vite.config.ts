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
  resolve: {
    // The QTI interaction edit components are Lit elements; dedupe Lit so a
    // single instance is used across the app and the workspace packages.
    dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
  },
  plugins: [tsconfigPaths({ projects: ['../../tsconfig.json'], ignoreConfigErrors: true })],
  optimizeDeps: {
    exclude: [
      '@qti-editor/interaction-shared',
      '@qti-editor/interaction-choice',
      '@qti-editor/interaction-extended-text',
      '@qti-editor/interaction-text-entry',
      '@qti-editor/qti-rubric-block',
      '@qti-editor/prosemirror-plugins',
      '@qti-editor/qti3-item-import',
      '@qti-editor/core',
    ],
  },
  server: {
    port: 5175,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
