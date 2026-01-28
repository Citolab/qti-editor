import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@qti-editor/plugin-qti-interactions/prosekit': fileURLToPath(
        new URL('../../packages/plugin-qti-interactions/src/prosekit.ts', import.meta.url),
      ),
      '@qti-editor/plugin-qti-interactions': fileURLToPath(
        new URL('../../packages/plugin-qti-interactions/src', import.meta.url),
      ),
      '@qti-editor/plugin-qti-attributes': fileURLToPath(
        new URL('../../packages/plugin-qti-attributes/index.ts', import.meta.url),
      ),
      '@qti-editor/plugin-qti-code': fileURLToPath(
        new URL('../../packages/plugin-qti-code/index.ts', import.meta.url),
      ),
      '@qti-editor/plugin-editor-events': fileURLToPath(
        new URL('../../packages/plugin-editor-events', import.meta.url),
      ),
      '@qti-editor/plugin-qti-import': fileURLToPath(
        new URL('../../packages/plugin-qti-import/src', import.meta.url),
      ),
      '@qti-editor/plugin-qti-validation': fileURLToPath(
        new URL('../../packages/plugin-qti-validation/src', import.meta.url),
      ),
      '@qti-editor/plugin-side-panel': fileURLToPath(
        new URL('../../packages/plugin-side-panel', import.meta.url),
      ),
      '@qti-editor/plugin-toolbar': fileURLToPath(
        new URL('../../packages/plugin-toolbar/src', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
  },
});
