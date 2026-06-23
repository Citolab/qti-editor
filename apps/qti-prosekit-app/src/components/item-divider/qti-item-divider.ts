import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * QTI Item Divider — local to qti-prosekit-app.
 *
 * Renders as a visual separator with a "Vraag {n}" label, where the index
 * comes from the `data-item-index` attribute set by items-gutter. When the
 * index is missing it falls back to the static "Item-scheiding" label.
 */
export class QtiItemDivider extends LitElement {
  @property({ type: String })
  override title = '';

  @property({ type: String })
  identifier = '';

  @property({ type: Number, attribute: 'data-item-index', reflect: false })
  itemIndex: number | null = null;

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

        :host([data-selected]) {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }
      `,
    ];
  }

  private label(): string {
    if (this.title) return this.title;
    if (this.itemIndex != null) return `Vraag ${this.itemIndex}`;
    return 'Item-scheiding';
  }

  override render() {
    return html`
      <div class="label"><span>${this.label()}</span></div>
      <div class="line"></div>
    `;
  }
}

if (!customElements.get('qti-item-divider')) {
  customElements.define('qti-item-divider', QtiItemDivider);
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-item-divider': QtiItemDivider;
  }
}
