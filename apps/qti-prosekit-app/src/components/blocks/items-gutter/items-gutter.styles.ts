import { css, type CSSResultGroup } from 'lit';

const styles: CSSResultGroup = css`
  :host {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3rem;
    background: hsl(var(--muted, 220 13% 95%) / 0.5);
    border-right: 1px solid hsl(var(--border, 220 13% 91%));
    overflow: hidden;
    user-select: none;
    z-index: 1;
  }
`;

export default styles;
