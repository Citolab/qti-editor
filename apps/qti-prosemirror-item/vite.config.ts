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
      '@citolab/prose-qti/components/shared',
      '@citolab/prose-qti/components/choice',
      '@citolab/prose-qti/components/extended-text',
      '@citolab/prose-qti/components/text-entry',
      '@citolab/prose-qti/components/rubric-block',
      '@qti-editor/prosemirror-plugins',
      '@citolab/prose-qti/qti3-item-import',
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
