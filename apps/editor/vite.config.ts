import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ ignoreConfigErrors: true }),
    {
      name: 'watch-node-modules',
      handleHotUpdate({ file, server }) {
        if (
          file.includes('node_modules/@qti-components/') ||
          file.includes('node_modules/@citolab/')
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
    watch: {
      // Watch all @qti-components packages in workspace node_modules
      ignored: ['!**/node_modules/@qti-components/**'],
      // Additional watch options for better change detection
      usePolling: true,
      interval: 100,
    },
  },
});
