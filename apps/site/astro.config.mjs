import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const litReactiveElementRoot = dirname(require.resolve('@lit/reactive-element'));
const coreSrcRoot = fileURLToPath(new URL('../../packages/qti/core/src', import.meta.url));
const prosekitIntegrationSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosekit/src', import.meta.url));
const prosekitExtensionsSrcRoot = fileURLToPath(new URL('../../packages/prosekit/extensions/src', import.meta.url));
const qtiStylesSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/core-css/core-css.css', import.meta.url));
const qtiInterfacesSrcRoot = fileURLToPath(new URL('../../packages/prose-qti/src/interfaces/index.ts', import.meta.url));
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
const prosemirrorAttributesSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosemirror/src/attributes', import.meta.url));
const prosemirrorAttributesUiProseKitSrcRoot = fileURLToPath(new URL('../../packages/extensions/prosemirror/src/attributes-ui', import.meta.url));
const proseQtiUiSrcRoot = fileURLToPath(new URL('../../packages/prose-qti-ui/src', import.meta.url));
const stylesSrcRoot = fileURLToPath(new URL('../../packages/styles/src', import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
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
          find: /^@citolab\/prose-qti-ui$/,
          replacement: `${proseQtiUiSrcRoot}/index.ts`,
        },
        {
          find: /^@citolab\/prose-qti-ui\/(.*)$/,
          replacement: `${proseQtiUiSrcRoot}/$1`,
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
    ],
    esbuild: {
      target: 'esnext',
    },
    optimizeDeps: {
      include: ['lit', 'lit/decorators.js'],
      exclude: [
        '@qti-components/associate-interaction',
        '@qti-components/base',
        '@qti-components/interactions',
        '@citolab/prose-qti-ui',
        '@citolab/prose-qti/components/register',
        '@citolab/prose-qti/components/shared',
        '@qti-editor/prosekit-extensions',
        '@citolab/prose-qti/components/choice',
        '@citolab/prose-qti/components/extended-text',
        '@citolab/prose-qti/components/associate',
        '@citolab/prose-qti/components/match',
        '@citolab/prose-qti/components/text-entry',
        '@citolab/prose-qti/components/select-point',
        '@citolab/prose-qti/components/inline-choice',
        '@citolab/prose-qti/components/gap-match',
        '@qti-editor/prosemirror-attributes',
        '@qti-editor/prosemirror-attributes-ui',
        '@qti-components/theme',
        '@qti-components/utilities',
      ],
      esbuildOptions: {
        target: 'esnext',
      },
      force: true,
    },
    ssr: {
      noExternal: [
        /^@qti-components\//,
        /^@qti-editor\/ui/,
      ],
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
    },
  },
  integrations: [
    starlight({
      title: 'QTI Editor',
      description: 'Composable QTI authoring editor with framework integrations.',
      social: {
        github: 'https://github.com/citolab/qti-editor',
      },
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
      sidebar: [
        {
          label: 'Get Started',
          items: [
            { label: 'Overview', slug: 'docs/getting-started/overview' },
            { label: 'Installation', slug: 'docs/getting-started/installation' },
          ],
        },
        {
          label: 'Using the Registry',
          items: [
            { label: 'Overview', slug: 'docs/using-the-registry' },
            { label: 'QTI Attributes Panel', slug: 'docs/using-the-registry/qti-attributes-panel' },
            { label: 'QTI Code Panel', slug: 'docs/using-the-registry/qti-code-panel' },
            { label: 'QTI Composer', slug: 'docs/using-the-registry/qti-composer' },
            { label: 'QTI Composer Metadata Form', slug: 'docs/using-the-registry/qti-composer-metadata-form' },
            { label: 'QTI Convert Menu', slug: 'docs/using-the-registry/qti-convert-menu' },
            { label: 'QTI Interaction Insert Menu', slug: 'docs/using-the-registry/qti-interaction-insert-menu' },
            { label: 'QTI Items Gutter', slug: 'docs/using-the-registry/qti-items-gutter' },
            { label: 'QTI Items Navigator', slug: 'docs/using-the-registry/qti-items-navigator' },
          ],
        },
        {
          label: 'Package Reference',
          items: [
            { label: 'Itembody-only QTI Subformat', slug: 'docs/packages/itembody-subformat' },
            { label: 'Prosemirror Plugins', slug: 'docs/packages/prosemirror-plugins' },
            { label: 'QTI Roundtrip Export Package', slug: 'docs/packages/qti-roundtrip-export' },
          ],
        },
        {
          label: 'QTI Interactions',
          items: [
            { label: 'Overview', slug: 'docs/qti-interactions' },
            { label: 'Associate Interaction', slug: 'docs/qti-interactions/associate' },
            { label: 'Choice Interaction', slug: 'docs/qti-interactions/choice' },
            { label: 'Extended Text Interaction', slug: 'docs/qti-interactions/extended-text' },
            { label: 'Gap Match Interaction', slug: 'docs/qti-interactions/gap-match' },
            { label: 'Hottext Interaction', slug: 'docs/qti-interactions/hottext' },
            { label: 'Inline Choice Interaction', slug: 'docs/qti-interactions/inline-choice' },
            { label: 'Match Interaction', slug: 'docs/qti-interactions/match' },
            { label: 'Order Interaction', slug: 'docs/qti-interactions/order' },
            { label: 'Select Point Interaction', slug: 'docs/qti-interactions/select-point' },
            { label: 'Text Entry Interaction', slug: 'docs/qti-interactions/text-entry' },
          ],
        },
        {
          label: 'Framework Guides',
          items: [
            { label: 'Overview', slug: 'docs/frameworks/overview' },
            { label: 'React Integration', slug: 'docs/frameworks/react' },
            { label: 'React Custom UI', slug: 'docs/frameworks/react/custom-ui' },
            { label: 'Angular Integration', slug: 'docs/frameworks/angular' },
            { label: 'Angular Custom UI', slug: 'docs/frameworks/angular/custom-ui' },
            { label: 'Vue Integration', slug: 'docs/frameworks/vue' },
            { label: 'Svelte Integration', slug: 'docs/frameworks/svelte' },
            { label: 'Vanilla JS / TypeScript', slug: 'docs/frameworks/vanilla' },
          ],
        },
      ],
    }),
  ],
});
