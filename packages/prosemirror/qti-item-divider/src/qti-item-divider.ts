import { css, html, LitElement } from 'lit';
import { translateQti } from '@qti-editor/interaction-shared';

/**
 * QTI Item Divider component.
 * 
 * Renders as a visual separator with text indicating it marks an item boundary.
 * When editing multiple QTI items in one editor, this provides a clear
 * visual and structural separation point.
 */
export class QtiItemDivider extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 2rem 0;
      user-select: none;
    }

    .divider-container {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .divider-line {
      flex: 1;
      height: 2px;
      background: linear-gradient(
        to right,
        transparent,
        hsl(var(--border, 220 13% 91%)),
        transparent
      );
    }

    .divider-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 1rem;
      background: hsl(var(--muted, 220 13% 95%));
      border: 1px solid hsl(var(--border, 220 13% 91%));
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: hsl(var(--muted-foreground, 220 9% 46%));
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .divider-icon {
      width: 1rem;
      height: 1rem;
      opacity: 0.7;
    }

    /* When selected in editor */
    :host([data-selected]) .divider-container {
      outline: 2px solid hsl(var(--ring, 221 83% 53%));
      outline-offset: 2px;
      border-radius: 0.375rem;
    }
  `;

  override render() {
    return html`
      <div class="divider-container">
        <div class="divider-line"></div>
        <div class="divider-label">
          <svg class="divider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          <span>${translateQti('divider.itemBoundary', { target: this })}</span>
        </div>
        <div class="divider-line"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-item-divider': QtiItemDivider;
  }
}

if (!customElements.get('qti-item-divider')) {
  customElements.define('qti-item-divider', QtiItemDivider);
}
