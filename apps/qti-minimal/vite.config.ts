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
const prosekitIntegrationSrcRoot = fileURLToPath(new URL('../../packages/qti/prosekit-integration/src', import.meta.url));
const interactionsSharedSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-shared/src', import.meta.url));
const interactionsChoiceSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-choice/src', import.meta.url));
const interactionsExtendedTextSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-extended-text/src', import.meta.url));
const interactionsMatchSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-match/src', import.meta.url));
const interactionsTextEntrySrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-text-entry/src', import.meta.url));
const interactionsSelectPointSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-select-point/src', import.meta.url));
const interactionsInlineChoiceSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/interaction-inline-choice/src', import.meta.url));
const prosemirrorAttributesSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/attributes/src', import.meta.url));
const prosemirrorAttributesUiProseKitSrcRoot = fileURLToPath(new URL('../../packages/prosemirror/attributes-ui-prosekit/src', import.meta.url));

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
        find: /^@qti-editor\/prosekit-integration\/item-context$/,
        replacement: `${prosekitIntegrationSrcRoot}/item-context/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration\/interactions\/prosekit$/,
        replacement: `${prosekitIntegrationSrcRoot}/interactions/prosekit.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration$/,
        replacement: `${prosekitIntegrationSrcRoot}/index.ts`,
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
      {
        find: /^@qti-editor\/prosemirror-attributes\/(.*)\.js$/,
        replacement: `${prosemirrorAttributesSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/prosemirror-attributes$/,
        replacement: `${prosemirrorAttributesSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/prosemirror-attributes-ui-prosekit\/(.*)\.js$/,
        replacement: `${prosemirrorAttributesUiProseKitSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/prosemirror-attributes-ui-prosekit$/,
        replacement: `${prosemirrorAttributesUiProseKitSrcRoot}/index.ts`,
      },
    ],
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ ignoreConfigErrors: true }),
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
      '@qti-editor/prosemirror-attributes',
      '@qti-editor/prosemirror-attributes-ui-prosekit',
      '@qti-components/theme',
      '@qti-components/utilities',
    ],
    force: true,
  },
  server: {
    port: 5174,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
