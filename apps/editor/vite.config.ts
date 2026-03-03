import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const interactionsSrcRoot = fileURLToPath(new URL('../../packages/interactions/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        // Keep existing explicit .js import style, but resolve to TS sources for HMR.
        find: /^@qti-editor\/interactions\/(.*)\.js$/,
        replacement: `${interactionsSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interactions$/,
        replacement: `${interactionsSrcRoot}/index.ts`,
      },
    ],
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ ignoreConfigErrors: true }),
    {
      name: 'watch-node-modules',
      handleHotUpdate({ file, server }) {
        if (
          file.includes('node_modules/@qti-components/') ||
          file.includes('node_modules/@citolab/') ||
          file.includes('node_modules/@qti-editor/')
        ) {
          server.ws.send({ type: 'full-reload' });
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      '@qti-components/base',
      '@qti-components/interactions',
      '@qti-editor/interactions',
      '@qti-components/theme',
      '@qti-components/utilities',
    ],
    // Force re-optimization to prevent caching of yalc-linked packages
    force: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [workspaceRoot],
    },
    watch: {
      // Keep workspace-linked package changes observable in dev.
      ignored: ['!**/node_modules/@qti-components/**', '!**/node_modules/@qti-editor/**'],
      // Additional watch options for better change detection
      usePolling: true,
      interval: 100,
    },
  },
});
