import { expect } from 'storybook/test';

import { toEqualXml } from './../tools/testing/setup/toEqualXml';

import type { Preview } from '@storybook/web-components-vite';

import './../packages/prose-qti/src/core-css/core-css.css';

// Make the `toEqualXml` matcher available to story `play` functions.
expect.extend({ toEqualXml });

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Docs', ['1. Introduction', '2. Extensions', '3. Editor Setup', '4. UI Components']],
      },
    },
  },
};

export default preview;
