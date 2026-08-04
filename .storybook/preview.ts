import { expect } from 'storybook/test';

import { toEqualXml } from './../tools/testing/setup/toEqualXml';

import type { Preview } from '@storybook/web-components-vite';

/*
 * Shared CSS reset, matching qti-components' own Storybook preview so stories
 * render on the same substrate here as they do upstream. modern-normalize =
 * normalize + the universal `box-sizing: border-box` rule. Imported from the
 * local dependency, not a CDN.
 *
 * It resets browser inconsistencies only. The *opinions* — paragraph/heading/
 * list margins, body typography — belong to the theme, imported after it.
 */
import 'modern-normalize/modern-normalize.css';

// Then the same order the apps use (see apps/*/src/app.css): the canonical
// theme palette, then the editor's core-css layered on top.
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
