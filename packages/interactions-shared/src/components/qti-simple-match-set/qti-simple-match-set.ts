import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-simple-match-set elements.
 * Container for qti-simple-associable-choice elements in match interactions.
 */
export class QtiSimpleMatchSetEdit extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 0.5em;
      border: 1px dashed #999;
      border-radius: 4px;
      background: #f9f9f9;
      min-width: 150px;
    }
  `;

  @property({ type: String, attribute: 'id' })
  public matchSetId: string | null = null;

  override render() {
    return html`<slot></slot>`;
  }
}
customElements.define('qti-simple-match-set', QtiSimpleMatchSetEdit);
