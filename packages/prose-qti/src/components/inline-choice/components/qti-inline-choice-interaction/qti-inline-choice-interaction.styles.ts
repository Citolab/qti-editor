import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/inline-choice-interaction/styles';

/**
 * Upstream uses CSS anchor positioning for the dropdown menu. The editor
 * intentionally falls back to plain absolute positioning so the menu shows
 * in browsers without `anchor-name` support; these rules override the
 * upstream menu positioning block.
 */
const styles: CSSResultGroup = [
  externalStyles,
  css`
    /* Keeps the closed combobox on one line where it sits inside a sentence. */
    :host {
      white-space: nowrap;
    }
    [part='menu'] {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 10;
      /*
       * white-space inherits, and the host's nowrap reached the menu — which pinned the option
       * rows onto a single line. Reset it here so the menu lays out like upstream's; the option's
       * own single-line clipping lives on qti-inline-choice itself.
       */
      white-space: normal;
    }
  `,
];

export default styles;
