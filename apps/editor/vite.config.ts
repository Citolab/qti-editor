import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const litReactiveElementRoot = dirname(require.resolve('@lit/reactive-element'));
const coreSrcRoot = fileURLToPath(new URL('../../packages/qti/core/src', import.meta.url));
const qtiEditorKitSrcRoot = fileURLToPath(new URL('../../packages/qti/editor-kit/src', import.meta.url));
const interactionsSharedSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-shared/src', import.meta.url));
const interactionsChoiceSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-choice/src', import.meta.url));
const interactionsExtendedTextSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-extended-text/src', import.meta.url));
const interactionsMatchSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-match/src', import.meta.url));
const interactionsTextEntrySrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-text-entry/src', import.meta.url));
const interactionsSelectPointSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-select-point/src', import.meta.url));
const interactionsInlineChoiceSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-inline-choice/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@qti-editor\/interaction-shared\/(.*)\.js$/,
        replacement: `${interactionsSharedSrcRoot}/$1.ts`,
      },
      {
        find: /^@lit\/reactive-element$/,
        replacement: `${litReactiveElementRoot}/reactive-element.js`,
      },
      {
        find: /^@lit\/reactive-element\/css-tag\.js$/,
        replacement: `${litReactiveElementRoot}/css-tag.js`,
      },
      {
        find: /^@lit\/reactive-element\/reactive-controller\.js$/,
        replacement: `${litReactiveElementRoot}/reactive-controller.js`,
      },
      {
        find: /^@lit\/reactive-element\/polyfill-support\.js$/,
        replacement: `${litReactiveElementRoot}/polyfill-support.js`,
      },
      {
        find: /^@lit\/reactive-element\/decorators\/(.*)$/,
        replacement: `${litReactiveElementRoot}/decorators/$1`,
      },
      {
        find: /^@qti-editor\/core\/composer$/,
        replacement: `${coreSrcRoot}/composer/index.ts`,
      },
      {
        find: /^@qti-editor\/core\/interactions\/composer$/,
        replacement: `${coreSrcRoot}/interactions/composer.ts`,
      },
      {
        find: /^@qti-editor\/core$/,
        replacement: `${coreSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/code$/,
        replacement: `${qtiEditorKitSrcRoot}/code/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/editor-context$/,
        replacement: `${qtiEditorKitSrcRoot}/editor-context/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/events$/,
        replacement: `${qtiEditorKitSrcRoot}/events/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/interactions\/prosekit$/,
        replacement: `${qtiEditorKitSrcRoot}/interactions/prosekit.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/interactions$/,
        replacement: `${qtiEditorKitSrcRoot}/interactions/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit\/item-context$/,
        replacement: `${qtiEditorKitSrcRoot}/item-context/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-editor-kit$/,
        replacement: `${qtiEditorKitSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-shared$/,
        replacement: `${interactionsSharedSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-choice\/(.*)\.js$/,
        replacement: `${interactionsChoiceSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-choice$/,
        replacement: `${interactionsChoiceSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-extended-text\/(.*)\.js$/,
        replacement: `${interactionsExtendedTextSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-extended-text$/,
        replacement: `${interactionsExtendedTextSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-match\/(.*)\.js$/,
        replacement: `${interactionsMatchSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-match$/,
        replacement: `${interactionsMatchSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-text-entry\/(.*)\.js$/,
        replacement: `${interactionsTextEntrySrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-text-entry$/,
        replacement: `${interactionsTextEntrySrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-select-point\/(.*)\.js$/,
        replacement: `${interactionsSelectPointSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-select-point$/,
        replacement: `${interactionsSelectPointSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-inline-choice\/(.*)\.js$/,
        replacement: `${interactionsInlineChoiceSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-inline-choice$/,
        replacement: `${interactionsInlineChoiceSrcRoot}/index.ts`,
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
      '@qti-editor/interaction-shared',
      '@qti-editor/interaction-choice',
      '@qti-editor/interaction-extended-text',
      '@qti-editor/interaction-match',
      '@qti-editor/interaction-text-entry',
      '@qti-editor/interaction-select-point',
      '@qti-editor/interaction-inline-choice',
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
