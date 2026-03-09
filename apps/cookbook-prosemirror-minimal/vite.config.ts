import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths({ ignoreConfigErrors: true })],
  server: {
    port: 5174,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
