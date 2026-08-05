import { css, type CSSResult, type CSSResultGroup } from 'lit';

import { QtiSimpleChoice } from '@qti-components/interactions-core';

/**
 * Upstream's stylesheet, plus the authoring-only additions.
 *
 * Runtime sets `user-select: none` for dragging; the editor needs the choice text selectable and
 * editable, because in the editor that text is what the author is typing.
 */
const styles: CSSResultGroup = [
  QtiSimpleChoice.styles as CSSResult,
  css`
    :host {
      user-select: unset !important;
      cursor: unset !important;
    }
    /* Style the control as clickable */
    [part='control'] {
      cursor: pointer;
    }
  `
];

export default styles;
