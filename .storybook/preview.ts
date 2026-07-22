import { expect } from 'storybook/test';

import { toEqualXml } from './../tools/testing/setup/toEqualXml';

import type { Preview } from '@storybook/web-components-vite';

// Same order the apps use (see apps/*/src/app.css): the canonical theme
// palette first, then the editor's core-css layered on top.
import '@qti-components/theme/item.css';
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
