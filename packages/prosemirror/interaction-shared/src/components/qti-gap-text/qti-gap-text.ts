import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class QtiGapTextEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      min-width: fit-content;
      padding: 0.5rem !important;
      border: 2px solid #c6cad0 !important;
      border-color: var(--qti-border, #c6cad0) !important;
      border-radius: 0.3rem !important;
      background: var(--qti-bg, #fff) !important;
      cursor: grab !important;
      transition: box-shadow 200ms ease-out, transform 200ms ease-out;
      box-sizing: border-box;
    }

    :host(:hover) {
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    :host([data-selected]) {
      border-color: var(--qti-border-active, #2563eb);
      background: var(--qti-bg-hover, #dbeafe);
      box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
    }

    :host([data-linked]) {
      background: var(--qti-bg-active, #e2e8f0);
    }

    :host([data-disabled]) {
      opacity: 0.6;
      cursor: not-allowed;
    }

    ::slotted(*) {
      margin: 0;
    }

    ::slotted(.ProseMirror-trailingBreak) {
      display: inline;
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
