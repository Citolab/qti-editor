import { html, LitElement } from 'lit';
export class QtiInlineChoice extends LitElement {
  override render() {
    return html` <slot></slot> `;
  }
}

if (!customElements.get('qti-inline-choice')) {
  customElements.define('qti-inline-choice', QtiInlineChoice);
}
