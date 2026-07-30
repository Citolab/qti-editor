import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/associate-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
    }

    /* The pending pulse used to live here, redirecting --qti-border-color/--qti-bg because an
       outer qti-theme ::part(drop) rule beat any shadow rule. It now lives once in prose-qti's
       core-css.css, in the qti-components.overrides layer, keyed off the "empty" part token this
       component emits (see _renderDropContainer). One definition for all four drop interactions. */
  `
];

export default styles;
