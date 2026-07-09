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

export default defineConfig({
  vite: {
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
        '@citolab/prose-qti/components/choice',
        '@citolab/prose-qti/components/extended-text',
        '@citolab/prose-qti/components/associate',
        '@citolab/prose-qti/components/match',
        '@citolab/prose-qti/components/text-entry',
        '@citolab/prose-qti/components/select-point',
        '@citolab/prose-qti/components/inline-choice',
        '@citolab/prose-qti/components/gap-match',
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
          label: 'Package Reference',
          items: [
            { label: 'Itembody-only QTI Subformat', slug: 'docs/packages/itembody-subformat' },
            { label: 'QTI 3 Item Import', slug: 'docs/packages/qti3-item-import' },
            { label: 'QTI Item Roundtrip', slug: 'docs/packages/qti-item-roundtrip' },
          ],
        },
        {
          label: 'ProseMirror Plugins',
          items: [
            { label: 'Overview', slug: 'docs/prosemirror-plugins' },
            { label: 'Block Select', slug: 'docs/prosemirror-plugins/block-select' },
            { label: 'Node Attrs Sync', slug: 'docs/prosemirror-plugins/node-attrs-sync' },
            { label: 'Semantic Paste', slug: 'docs/prosemirror-plugins/paste-semantic-html' },
          ],
        },
        {
          label: 'Integration Guide',
          items: [
            { label: 'Overview', slug: 'docs/frameworks/overview' },
            { label: 'TypeScript', slug: 'docs/frameworks/vanilla' },
          ],
        },
      ],
    }),
  ],
});
