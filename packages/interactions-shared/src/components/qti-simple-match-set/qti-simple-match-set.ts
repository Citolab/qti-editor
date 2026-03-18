import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-simple-match-set elements.
 * Container for qti-simple-associable-choice elements in match interactions.
 */
export class QtiSimpleMatchSetEdit extends LitElement {

  @property({ type: String, attribute: 'id' })
  public matchSetId: string | null = null;

  override render() {
    return html`<slot></slot>`;
  }
}
customElements.define('qti-simple-match-set', QtiSimpleMatchSetEdit);
