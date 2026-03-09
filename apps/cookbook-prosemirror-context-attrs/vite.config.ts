import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths({ ignoreConfigErrors: true })],
  server: {
    port: 5175,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
