import { css, type CSSResultGroup } from 'lit';

import { editorWhiteSpace } from '../../styles/white-space.js';

const styles: CSSResultGroup = [
  editorWhiteSpace,
  css`
    /* Wrapper generates no box so it doesn't affect the slotted layout. */
    .slot-wrapper {
      display: contents;
    }
  `,
];

export default styles;
