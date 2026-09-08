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
/*
 * decorations.css is deliberately NOT imported here.
 *
 * It is opt-in for hosts, and it has to be opt-in for stories too — for a reason that only shows up
 * in VRT. The stylesheet gives `qti-choice-interaction` hover states (a boundary tint, per-choice
 * outlines, a revealed ×), but the affordances those belong to only exist where a story installs the
 * decorator plugins. Imported globally it therefore made every choice story pointer-sensitive while
 * adding an affordance to none of them: a capture would differ by ~0.4% of its pixels depending on
 * where the shared browser's cursor happened to be left by an earlier story. ITEM002 failed roughly
 * one run in three that way.
 *
 * So the stories that mount the decorators import it themselves — see
 * apps/e2e/stories/item001-qti-choice-interaction.regression.stories.ts — and park the pointer
 * explicitly in their `play`.
 */

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
