import { css, html, LitElement } from 'lit';
import { translateQti } from '@qti-editor/interaction-shared';

/**
 * QTI Item Divider component.
 * 
 * Renders as a visual separator with text indicating it marks an item boundary.
 * When editing multiple QTI items in one editor, this provides a clear
 * visual and structural separation point.
 * 
 * The item index (0-based) is set via the `itemIndex` property or `data-item-index` attribute.
 * The badge displays itemIndex + 1 (1-based for display).
 */
export class QtiItemDivider extends LitElement {
  static override get styles() {
    return [
      css`
        :host {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          user-select: none;
          padding: 0.25rem 0;
          color: #94a3b8;
        }

        .line {
          flex: 1;
          height: 1px;
          background-color: #e2e8f0;
        }

        .label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.625rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        svg {
          width: 0.875rem;
          height: 0.875rem;
          opacity: 0.7;
        }

        :host([data-selected]) {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }
      `
    ];
  }

  override render() {
    return html`
      <div class="line"></div>
      <div class="label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
        <span>${translateQti('divider.itemBoundary', { target: this })}</span>
      </div>
      <div class="line"></div>
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
