import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import tsconfigPaths from 'vite-tsconfig-paths';

import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  "stories": [
    "../packages/**/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../packages/**/src/**/*.mdx",
    "../apps/**/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../apps/**/src/**/*.mdx"
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
  "framework": "@storybook/web-components-vite",
  async viteFinal(config: any, { configType }: { configType?: string }) {
    return {
      ...config,
      plugins: [
        ...(config.plugins || []),
        tailwindcss(),
        tsconfigPaths({
          projects: [
            './tsconfig.json'
          ],
          ignoreConfigErrors: true,
        }),
      ],
      resolve: {
        ...config.resolve
      }
    };
  }
};
export default config;
