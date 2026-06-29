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
    :host {
      white-space: nowrap;
    }
    [part='menu'] {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 10;
    }
  `,
];

export default styles;
