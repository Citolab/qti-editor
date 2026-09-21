import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/inline-choice-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

/**
 * Upstream uses CSS anchor positioning and a top-layer popover for the dropdown menu. The editor
 * uses the same layout model. This matters because an in-flow menu can be clipped by the table,
 * editor card, or any scrolling ancestor even when its own overflow is visible.
 *
 * Width is measured by MenuAutoSizeMixin and written to the trigger inside the shadow root. That
 * keeps ProseMirror's host node immutable while preserving a stable width for the longest option.
 */
const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    /* Keep the closed combobox on one line where it sits inside a sentence. */
    :host {
      white-space: nowrap;
    }

    /* The menu is a native popover; upstream's anchor and top-layer rules remain authoritative. */
    [part='menu'] {
      white-space: normal;
    }

    /* Holds MenuAutoSizeMixin's throwaway measurement clones — see menuAutoSizeRows() in the
       class. Out of flow and invisible; only ever populated for the span of one measurement. */
    [part='measure-sandbox'] {
      position: absolute;
      visibility: hidden;
      pointer-events: none;
    }
  `,
];

export default styles;
