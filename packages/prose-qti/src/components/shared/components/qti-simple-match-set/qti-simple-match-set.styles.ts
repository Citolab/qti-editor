import { css, type CSSResultGroup } from 'lit';

const styles: CSSResultGroup = css`
  /* Wrapper generates no box so it doesn't affect the slotted layout. */
  .slot-wrapper {
    display: contents;
  }

`;

export default styles;
