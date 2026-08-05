import { css, type CSSResultGroup } from 'lit';

/*
 * Shadow CSS is intentionally minimal — only what is structurally required (host layout, label
 * whitespace, button geometry/hover-reveal). The chip visual (border, background, padding) is owned
 * by qti-theme and reached from outside via host::part(drag) selectors. See qti.css.
 */
const styles: CSSResultGroup = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
  }

  /*
   * The grip. Deliberately empty and unpainted here: qti-theme draws it through
   * "qti-match-interaction ::part(drag-control)::before" (the grip mixin's mask-image), the same
   * selector it uses for the runtime chip. Exposing the part is the whole contract — the editor
   * gets the runtime's icon for free and cannot drift from it. Without this the placed chips were
   * correctly purple but had no grip, because nothing in the shadow carried that part.
   */
  [part='drag-control'] {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .label {
    white-space: nowrap;
  }

  /*
   * The whole chip is the control, so it says so and nothing more.
   *
   * No hover treatment that hides the label: hovering is how a pointer crosses the screen, and
   * blurring or covering the words at exactly the moment they are pointed at is the wrong trade.
   * The outline is the theme's own focus colour so a brand moves it, and it is drawn OUTSIDE the
   * box — outline does not participate in layout, so nothing shifts.
   */
  :host([interactive]) {
    cursor: pointer;
  }
`;

export default styles;
