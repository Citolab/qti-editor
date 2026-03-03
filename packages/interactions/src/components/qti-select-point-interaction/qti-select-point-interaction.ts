import { css, html } from 'lit';
import { Interaction } from '../interaction';

import type { CSSResultGroup } from 'lit';

export class QtiSelectPointInteractionEdit extends Interaction {
  static override styles: CSSResultGroup = [
    css`
      :host {
        display: block;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 12px;
        background: #ffffff;
      }

      ::slotted(qti-prompt) {
        display: block;
        margin-bottom: 10px;
      }

      ::slotted(img-select-point) {
        display: block;
      }
    `,
  ];

  override render() {
    return html`<slot part="prompt" name="prompt"></slot><slot></slot>`;
  }
}

customElements.define('qti-select-point-interaction', QtiSelectPointInteractionEdit);
