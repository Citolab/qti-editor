import { css, type CSSResult, type CSSResultGroup } from 'lit';

import { QtiInlineChoice } from '@qti-components/interactions-core';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

/** Upstream's stylesheet, plus the editor's own radio control and label affordances. */
const styles: CSSResultGroup = [
  editorWhiteSpace,
  QtiInlineChoice.styles as CSSResult,
  css`
    /* Upstream has no control to space away from the label. */
    :host {
      gap: 0.25rem;
    }

    [part='control'] {
      cursor: pointer;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      border: 1px solid currentColor;
      border-radius: 50%;
      box-sizing: border-box;
    }

    [part='control-mark'] {
      width: 0.5em;
      height: 0.5em;
      border-radius: 50%;
      background: transparent;
    }

    :host(:state(checked)) [part='control-mark'] {
      background: currentColor;
    }

    [part='label'] {
      flex: 1;
      min-width: 0;
      cursor: text;
    }
  `
];

export default styles;
