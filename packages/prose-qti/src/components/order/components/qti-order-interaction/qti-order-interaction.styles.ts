import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/order-interaction/styles';

/**
 * Shadow-DOM styles. Layout only — drop-slot per-state visuals (idle,
 * pending pulse, filled) and chip styling are app-owned via host-state
 * selectors (`qti-order-interaction:state(pending) ::part(drop)`)
 * and qti-theme's `::part(drag)` rules.
 */
const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
      position: relative;
      overflow: visible;
    }

    slot[name='prompt'] {
      display: block;
      margin-bottom: 8px;
    }

    slot:not([name]) {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .interaction-preview {
      align-items: flex-start;
    }

    .preview-drags {
      min-width: 0;
    }

    .preview-drops {
      min-width: min(18rem, 100%);
      gap: 0.5rem;
      align-content: start;
    }

    .order-slot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px;
      min-height: 3rem;
    }

    /* The pending pulse used to live here, redirecting --qti-border-color/--qti-bg because an
       outer qti-theme ::part(drop) rule beat any shadow rule. It now lives once in prose-qti's
       core-css.css, in the qti-components.overrides layer, keyed off the "empty" part token this
       component emits (see _renderSlots). One definition for all four drop interactions. */
  `,
];

export default styles;
