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

  button[part='chip-remove'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 100ms ease-out;
  }

  :host(:hover) button[part='chip-remove'],
  button[part='chip-remove']:focus {
    opacity: 0.7;
  }

  button[part='chip-remove']:hover {
    opacity: 1;
    background: rgb(0 0 0 / 0.1);
  }
`;

export default styles;
