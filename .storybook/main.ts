
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import tsconfigPaths from 'vite-tsconfig-paths';

import { getQtiComponentsSourceLinkConfig } from '../tools/vite/qti-components-source-link.ts';

import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  "stories": [
    // "../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../packages/*/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../packages/*/src/**/*.mdx",
    // "../packages/*/*/src/**/*.mdx",
    // "../apps/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // "../apps/*/src/**/*.mdx",
    "../apps/*/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
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
    const editorRoot = fileURLToPath(new URL('..', import.meta.url));
    const sourceLink = getQtiComponentsSourceLinkConfig(editorRoot);
    const existingAliases = Array.isArray(config.resolve?.alias) ? config.resolve.alias : [];
    const existingAllow = Array.isArray(config.server?.fs?.allow) ? config.server.fs.allow : [];
    const existingExclude = Array.isArray(config.optimizeDeps?.exclude) ? config.optimizeDeps.exclude : [];

    return {
      ...config,
      publicDir: false,
      plugins: [
        ...(config.plugins || []),
        tailwindcss(),
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
          allow: sourceLink.enabled ? Array.from(new Set([...existingAllow, editorRoot, ...sourceLink.fsAllow])) : existingAllow,
        },
      },
    };
  }
};
export default config;
