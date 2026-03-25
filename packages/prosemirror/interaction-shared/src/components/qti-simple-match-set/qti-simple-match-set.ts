import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Editor component for qti-simple-match-set elements.
 * Container for qti-simple-associable-choice elements in match interactions.
 */
export class QtiSimpleMatchSetEdit extends LitElement {

  @property({ type: String, attribute: 'id' })
  matchSetId: string | null = null;

  override render() {
    return html`<slot></slot>`;
  }
}
if (!customElements.get('qti-simple-match-set')) {
  customElements.define('qti-simple-match-set', QtiSimpleMatchSetEdit);
}
