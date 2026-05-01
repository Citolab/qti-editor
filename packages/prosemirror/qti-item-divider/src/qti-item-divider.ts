import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
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
          white-space: nowrap;
        }
      `
    ];
  }

  /**
   * 0-based index of the item that starts after this divider.
   * Display shows itemIndex + 1.
   */
  @property({ type: Number, attribute: 'data-item-index', reflect: true })
  itemIndex: number | null = null;
  
  // Render to light DOM for easier CSS integration with gutter
  override createRenderRoot() {
    return this;
  }

  override render() {
    const displayIndex = this.itemIndex !== null ? this.itemIndex + 1 : null;

    return html`
      <div class="divider-container">
        <div class="divider-line"></div>
        ${displayIndex !== null ? html`
          <div class="divider-badge">${displayIndex}</div>
        ` : null}
        <div class="divider-label">
          <svg class="divider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          <span>${translateQti('divider.itemBoundary', { target: this })}</span>
        </div>
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
