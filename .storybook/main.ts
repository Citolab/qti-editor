import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  "stories": [
    "../apps/editor/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../packages/coco/src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
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
