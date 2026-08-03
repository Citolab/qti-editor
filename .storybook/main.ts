
import remarkGfm from 'remark-gfm';
import tsconfigPaths from 'vite-tsconfig-paths';

import { getQtiComponentsSourceLinkConfig } from '../scripts/qti-components-source-link.mjs';

import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  "stories": [
    // "../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../packages/*/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../packages/*/src/**/*.mdx",
    // "../packages/*/*/src/**/*.mdx",
    // "../apps/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../apps/*/src/**/*.mdx",
    "../apps/*/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // Docs-only pages. Kept beside the stories rather than in apps/site/src/content/docs, because
    // that site documents the editor for people USING it, and these document the repo's own tooling
    // for people working ON it — a different audience and a different lifetime.
    "../apps/*/stories/**/*.mdx"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
  staticDirs: ['../public'],
  "framework": "@storybook/web-components-vite",
  async viteFinal(config: any) {
    const editorRoot = process.cwd();
    const sourceLink = getQtiComponentsSourceLinkConfig(editorRoot);

    /*
     * Say which qti-components this storybook is serving, because the answer is invisible otherwise.
     *
     * Source-link mode leaves no tracked artifact on purpose — the whole point is that a local
     * setup cannot ride along into a commit — so the only evidence is a gitignored state file. And
     * this function runs ONCE, when the dev server boots: `just link` / `just unlink` cannot reach
     * a storybook that is already running, which reads as "link does nothing" when it is really
     * "link needs a restart". One line at startup settles both questions.
     */
    console.log(
      sourceLink.enabled
        ? `[qti-components] LOCAL SOURCE — ${sourceLink.aliases.length} aliases from ${sourceLink.qtiComponentsRoot}\n` +
            `[qti-components] run "just unlink" AND restart storybook to go back to the published packages`
        : `[qti-components] published packages (source-link off) — "just link" then restart storybook to develop against local source`,
    );
    const existingAliases = Array.isArray(config.resolve?.alias) ? config.resolve.alias : [];
    const existingAllow = Array.isArray(config.server?.fs?.allow) ? config.server.fs.allow : [];
    const existingExclude = Array.isArray(config.optimizeDeps?.exclude) ? config.optimizeDeps.exclude : [];

    return {
      ...config,
      publicDir: false,
      /*
       * No tailwindcss() here on purpose. Tailwind and daisyUI belong to the ProseKit app examples
       * (apps/qti-prosekit-app, apps/qti-prosekit-item), apps/site and packages/prose-qti-ui — each
       * of which imports "tailwindcss" from its own style.css and runs the plugin in its own Vite
       * config. Nothing Storybook loads does: preview.ts pulls modern-normalize, the qti-components
       * theme and prose-qti's core-css, and the regression stories add only their own CSS.
       *
       * Running it here meant every stylesheet in the storybook went through Tailwind's parser for
       * no benefit — it emitted nothing, but it did reject valid CSS (a "*\/" sequence inside a
       * comment took the whole storybook down with "Missing opening (").
       */
      plugins: [
        ...(config.plugins || []),
        tsconfigPaths({
          projects: [
            './tsconfig.json',
            './apps/e2e/tsconfig.json',
          ],
          ignoreConfigErrors: true,
        }),
      ],
      css: {
        ...(config.css || {}),
        devSourcemap: true,
      },
      build: {
        ...(config.build || {}),
        sourcemap: true,
      },
      resolve: {
        ...(config.resolve || {}),
        alias: sourceLink.enabled ? [...sourceLink.aliases, ...existingAliases] : existingAliases,
      },
      optimizeDeps: {
        ...(config.optimizeDeps || {}),
        exclude: sourceLink.enabled
          ? Array.from(new Set([...existingExclude, ...sourceLink.optimizeDepsExclude]))
          : existingExclude,
      },
      server: {
        ...(config.server || {}),
        fs: {
          ...(config.server?.fs || {}),
          // editorRoot must be allowed in BOTH modes: the stories live in apps/e2e/stories, which is
          // outside .storybook. Assigning `allow` at all opts out of Vite's default (the workspace
          // root), so the disabled branch previously narrowed it to `[]` and 403'd every story
          // module. Source-link only adds the linked qti-components paths on top.
          allow: Array.from(
            new Set([...existingAllow, editorRoot, ...(sourceLink.enabled ? sourceLink.fsAllow : [])])
          ),
        },
      },
    };
  }
};
export default config;
