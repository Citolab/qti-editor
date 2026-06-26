import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const litReactiveElementRoot = dirname(require.resolve('@lit/reactive-element'));
const coreSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/core', import.meta.url));
const qtiItemExportSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/item-export', import.meta.url));
const qtiTestExportSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/test-export', import.meta.url));
const prosekitIntegrationSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/integration', import.meta.url));
const prosekitExtensionsSrcRoot = fileURLToPath(new URL('../../packages/prose-extensions/src/prosekit', import.meta.url));
const qtiStylesSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/core-css/core-css.css', import.meta.url));
const qtiInterfacesSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/interfaces/index.ts', import.meta.url));
const interactionsSharedSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/shared', import.meta.url));
const interactionsUmbrellaSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components', import.meta.url));
const interactionsChoiceSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/choice/src', import.meta.url));
const interactionsExtendedTextSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/extended-text/src', import.meta.url));
const interactionsMatchSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/match/src', import.meta.url));
const interactionsTextEntrySrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/text-entry/src', import.meta.url));
const interactionsSelectPointSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/select-point/src', import.meta.url));
const interactionsInlineChoiceSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/inline-choice/src', import.meta.url));
const prosemirrorPluginsSrcRoot = fileURLToPath(new URL('../../packages/prose-extensions/src/prosemirror', import.meta.url));

export default defineConfig(({ command }) => ({
  resolve: {
    // Dev only: the dev server pre-bundles deps (optimizeDeps), which can create
    // two instances of @prosekit/core — one for the app's `prosekit/core` import
    // and one for the block-handle web component imported via @citolab/prose-qti-ui.
    // Two instances make ProseKit's facet union assert when the block-handle
    // calls `editor.use(...)`. Deduping forces a single instance. The production
    // build uses a single Rollup module graph and must NOT dedupe (it breaks
    // resolution of prosekit's nested @prosekit/* sub-packages).
    dedupe:
      command === 'serve'
        ? ['prosekit', '@prosekit/core', '@prosekit/web', '@prosekit/lit', '@prosekit/extensions', '@prosekit/basic', '@prosekit/pm']
        : [],
    alias: [
      {
        find: /^@qti-editor\/styles$/,
        replacement: qtiStylesSrcRoot,
      },
      {
        find: /^@qti-editor\/interfaces$/,
        replacement: qtiInterfacesSrcRoot,
      },
      {
        find: /^@qti-editor\/interaction-shared\/(.*)\.js$/,
        replacement: `${interactionsSharedSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interactions$/,
        replacement: `${interactionsUmbrellaSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/associate$/,
        replacement: `${interactionsUmbrellaSrcRoot}/associate/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/choice$/,
        replacement: `${interactionsUmbrellaSrcRoot}/choice/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/extended-text$/,
        replacement: `${interactionsUmbrellaSrcRoot}/extended-text/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/gap-match$/,
        replacement: `${interactionsUmbrellaSrcRoot}/gap-match/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/hottext$/,
        replacement: `${interactionsUmbrellaSrcRoot}/hottext/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/inline-choice$/,
        replacement: `${interactionsUmbrellaSrcRoot}/inline-choice/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/match$/,
        replacement: `${interactionsUmbrellaSrcRoot}/match/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/order$/,
        replacement: `${interactionsUmbrellaSrcRoot}/order/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/select-point$/,
        replacement: `${interactionsUmbrellaSrcRoot}/select-point/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/shared$/,
        replacement: `${interactionsUmbrellaSrcRoot}/shared/index.ts`,
      },
      {
        find: /^@qti-editor\/interactions\/text-entry$/,
        replacement: `${interactionsUmbrellaSrcRoot}/text-entry/index.ts`,
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
        find: /^@qti-editor\/qti-item-export\/pm-qti-item$/,
        replacement: `${qtiItemExportSrcRoot}/pm-qti-item.ts`,
      },
      {
        find: /^@qti-editor\/qti-item-export\/pm-xml$/,
        replacement: `${qtiItemExportSrcRoot}/pm-xml.ts`,
      },
      {
        find: /^@qti-editor\/qti-test-export\/pm-qti-test$/,
        replacement: `${qtiTestExportSrcRoot}/pm-qti-test.ts`,
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
        find: /^@citolab\/prose-extensions\/prosekit$/,
        replacement: `${prosekitExtensionsSrcRoot}/index.ts`,
      },
      {
        find: /^@citolab\/prose-extensions\/prosemirror$/,
        replacement: `${prosemirrorPluginsSrcRoot}/index.ts`,
      },
      {
        find: /^@citolab\/prose-extensions\/block-select$/,
        replacement: `${prosemirrorPluginsSrcRoot}/block-select/index.ts`,
      },
      {
        find: /^@citolab\/prose-extensions\/node-attrs-sync$/,
        replacement: `${prosemirrorPluginsSrcRoot}/node-attrs-sync/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-extensions\/marks$/,
        replacement: `${prosekitExtensionsSrcRoot}/strong-em.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-extensions\/list$/,
        replacement: `${prosekitExtensionsSrcRoot}/list.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-extensions$/,
        replacement: `${prosekitExtensionsSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/prosemirror-plugins\/(.*)\.js$/,
        replacement: `${prosemirrorPluginsSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/prosemirror-plugins$/,
        replacement: `${prosemirrorPluginsSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/prosemirror-attributes-ui\/(.*)\.js$/,
        replacement: `${prosemirrorAttributesUiProseKitSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/prosemirror-attributes-ui$/,
        replacement: `${prosemirrorAttributesUiProseKitSrcRoot}/index.ts`,
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
          return [];
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      '@qti-components/associate-interaction',
      '@qti-components/base',
      '@qti-components/choice-interaction',
      '@qti-components/extended-text-interaction',
      '@qti-components/hottext-interaction',
      '@qti-components/inline-choice-interaction',
      '@qti-components/interactions',
      '@qti-components/interactions-core',
      '@qti-components/match-interaction',
      '@qti-components/order-interaction',
      '@qti-components/text-entry-interaction',
      '@qti-components/theme',
      '@qti-components/transformers',
      '@qti-components/utilities',
      '@citolab/prose-qti/components/register',
      '@citolab/prose-qti/components/shared',
      '@citolab/prose-qti/components/choice',
      '@citolab/prose-qti/components/extended-text',
      '@citolab/prose-qti/components/match',
      '@citolab/prose-qti/components/text-entry',
      '@citolab/prose-qti/components/select-point',
      '@citolab/prose-qti/components/inline-choice',
      '@citolab/prose-extensions/prosekit',
      '@citolab/prose-extensions/prosemirror',
    ],
    force: true,
  },
  server: {
    port: 5174,
    fs: {
      allow: [workspaceRoot],
    },
    watch: {
      ignored: ['!**/node_modules/@qti-components/**', '!**/node_modules/@qti-editor/**'],
      usePolling: true,
      interval: 100,
    },
  },
}));
