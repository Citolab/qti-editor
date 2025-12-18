import { defineConfig } from "vite";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@qti-editor/core": fileURLToPath(
        new URL("../../packages/core/src", import.meta.url)
      ),
      "@qti-editor/plugin-qti-components": fileURLToPath(
        new URL("../../packages/plugin-qti-components/src", import.meta.url)
      ),
      "@qti-editor/plugin-slash-menu": fileURLToPath(
        new URL("../../packages/plugin-slash-menu/src", import.meta.url)
      ),
      "@qti-editor/plugin-qti-import": fileURLToPath(
        new URL("../../packages/plugin-qti-import/src", import.meta.url)
      ),
      "@qti-editor/plugin-toolbar": fileURLToPath(
        new URL("../../packages/plugin-toolbar/src", import.meta.url)
      ),
      "@qti-editor/plugin-side-panel": fileURLToPath(
        new URL("../../packages/plugin-side-panel", import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
  },
});
