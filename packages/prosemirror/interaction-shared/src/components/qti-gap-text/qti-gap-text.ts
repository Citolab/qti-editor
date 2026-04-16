import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class QtiGapTextEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      min-width: 4rem;
      padding: 0.25rem 0.6rem;
      border: 1px solid var(--qti-border, #cbd5e1);
      border-radius: 999px;
      background: var(--qti-bg, #fff);
      cursor: pointer;
    }

    :host([data-selected]) {
      border-color: var(--qti-border-active, #2563eb);
      background: var(--qti-bg-hover, #dbeafe);
    }

    :host([data-linked]) {
      background: var(--qti-bg-active, #e2e8f0);
    }

    :host([data-disabled]) {
      opacity: 0.6;
    }

    ::slotted(*) {
      margin: 0;
    }
  `;

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  override connectedCallback(): void {
    super.connectedCallback();
    const inInteraction = this.parentElement?.tagName.endsWith('INTERACTION') ?? false;
    if (inInteraction) {
      this.setAttribute('slot', 'drags');
    }
  }

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('qti-gap-text')) {
  customElements.define('qti-gap-text', QtiGapTextEdit);
}
