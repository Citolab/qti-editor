import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const litReactiveElementRoot = dirname(require.resolve('@lit/reactive-element'));
const coreSrcRoot = fileURLToPath(new URL('../../packages/qti/core/src', import.meta.url));
const prosekitIntegrationSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosekit/src', import.meta.url));
const prosekitExtensionsSrcRoot = fileURLToPath(new URL('../../packages/prosekit/extensions/src', import.meta.url));
const qtiPackageSrcRoot = fileURLToPath(new URL('../../packages/qti/package-builder/src', import.meta.url));
const interactionsSharedSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/shared', import.meta.url));
const interactionsUmbrellaSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components', import.meta.url));
const interactionsChoiceSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/choice/src', import.meta.url));
const interactionsExtendedTextSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/extended-text/src', import.meta.url));
const interactionsAssociateSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/associate/src', import.meta.url));
const interactionsMatchSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/match/src', import.meta.url));
const interactionsOrderSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/order/src', import.meta.url));
const interactionsTextEntrySrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/text-entry/src', import.meta.url));
const interactionsSelectPointSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/select-point/src', import.meta.url));
const interactionsInlineChoiceSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/inline-choice/src', import.meta.url));
const interactionsGapMatchSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/gap-match/src', import.meta.url));
const interactionsHottextSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/hottext/src', import.meta.url));
const qtiItemDividerSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/item-divider/src', import.meta.url));
const qtiRubricBlockSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/components/rubric-block/src', import.meta.url));
const prosemirrorPluginsSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosemirror/src', import.meta.url));
const prosemirrorAttributesSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosemirror/src/attributes', import.meta.url));
const prosemirrorAttributesUiProseKitSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosemirror/src/attributes-ui', import.meta.url));
const appCustomElementRoots = [
  fileURLToPath(new URL('./src/components/qti-editor-app.ts', import.meta.url)),
  fileURLToPath(new URL('./src/components/qti-slash-menu.ts', import.meta.url)),
];
const fullReloadRoots = [
  coreSrcRoot,
  prosekitIntegrationSrcRoot,
  qtiPackageSrcRoot,
  interactionsUmbrellaSrcRoot,
  interactionsSharedSrcRoot,
  prosekitExtensionsSrcRoot,
  interactionsChoiceSrcRoot,
  interactionsExtendedTextSrcRoot,
  interactionsAssociateSrcRoot,
  interactionsMatchSrcRoot,
  interactionsOrderSrcRoot,
  interactionsTextEntrySrcRoot,
  interactionsSelectPointSrcRoot,
  interactionsInlineChoiceSrcRoot,
  interactionsGapMatchSrcRoot,
  interactionsHottextSrcRoot,
  qtiItemDividerSrcRoot,
  prosemirrorPluginsSrcRoot,
  prosemirrorAttributesSrcRoot,
  prosemirrorAttributesUiProseKitSrcRoot,
];

function shouldForceFullReload(file: string): boolean {
  if (appCustomElementRoots.includes(file)) {
    return true;
  }

  return fullReloadRoots.some(root => file.startsWith(`${root}/`));
}

export default defineConfig({
  resolve: {
    alias: [
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
        find: /^@qti-editor\/prosekit-integration\/code$/,
        replacement: `${prosekitIntegrationSrcRoot}/code/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration\/editor-context$/,
        replacement: `${prosekitIntegrationSrcRoot}/editor-context/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration\/events$/,
        replacement: `${prosekitIntegrationSrcRoot}/events/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration\/interactions\/prosekit$/,
        replacement: `${prosekitIntegrationSrcRoot}/interactions/prosekit.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration\/item-context$/,
        replacement: `${prosekitIntegrationSrcRoot}/item-context/index.ts`,
      },
      {
        find: /^@qti-editor\/prosekit-integration$/,
        replacement: `${prosekitIntegrationSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/qti-package-builder$/,
        replacement: `${qtiPackageSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/interaction-associate\/(.*)\.js$/,
        replacement: `${interactionsAssociateSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-associate$/,
        replacement: `${interactionsAssociateSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/interaction-order\/(.*)\.js$/,
        replacement: `${interactionsOrderSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-order$/,
        replacement: `${interactionsOrderSrcRoot}/index.ts`,
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
        find: /^@qti-editor\/interaction-gap-match\/(.*)\.js$/,
        replacement: `${interactionsGapMatchSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-gap-match$/,
        replacement: `${interactionsGapMatchSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/interaction-hottext\/(.*)\.js$/,
        replacement: `${interactionsHottextSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/interaction-hottext$/,
        replacement: `${interactionsHottextSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-item-divider\/(.*)\.js$/,
        replacement: `${qtiItemDividerSrcRoot}/$1.ts`,
      },
      {
        find: /^@qti-editor\/qti-item-divider$/,
        replacement: `${qtiItemDividerSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-rubric-block$/,
        replacement: `${qtiRubricBlockSrcRoot}/index.ts`,
      },
      {
        find: /^@qti-editor\/qti-rubric-block\/(.*)\.js$/,
        replacement: `${qtiRubricBlockSrcRoot}/$1.ts`,
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
    react(),
    tailwindcss(),
    tsconfigPaths({ ignoreConfigErrors: true }),
    {
      name: 'watch-node-modules',
      handleHotUpdate({ file, server }) {
        if (
          file.includes('node_modules/@qti-components/') ||
          file.includes('node_modules/@citolab/') ||
          file.includes('node_modules/@qti-editor/') ||
          shouldForceFullReload(file)
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
      '@citolab/prose-extensions/prosekit',
      '@citolab/prose-qti/package-builder',
      '@citolab/prose-qti/components/choice',
      '@citolab/prose-qti/components/extended-text',
      '@citolab/prose-qti/components/associate',
      '@citolab/prose-qti/components/match',
      '@citolab/prose-qti/components/order',
      '@citolab/prose-qti/components/text-entry',
      '@citolab/prose-qti/components/select-point',
      '@citolab/prose-qti/components/inline-choice',
      '@citolab/prose-qti/components/gap-match',
      '@citolab/prose-qti/components/hottext',
      '@citolab/prose-qti/components/item-divider',
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
