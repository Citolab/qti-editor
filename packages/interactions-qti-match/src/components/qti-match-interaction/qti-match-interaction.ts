import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-match-interaction.
 * Renders two match sets side by side for creating associations.
 */
export class QtiMatchInteractionEdit extends Interaction {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1em;
      margin: 1em 0;
      background: #fafafa;
    }
    ::slotted(qti-prompt) {
      display: block;
      margin-bottom: 1em;
      font-weight: 500;
    }
    .match-sets {
      display: flex;
      gap: 2em;
      justify-content: space-around;
    }
    ::slotted(qti-simple-match-set) {
      flex: 1;
      max-width: 45%;
    }
  `;

  @property({ type: Number, attribute: 'max-associations' })
  public maxAssociations: number = 1;

  @property({ type: Number, attribute: 'min-associations' })
  public minAssociations: number = 0;

  @property({ type: Boolean })
  public shuffle: boolean = false;

  @property({ type: String, attribute: 'class' })
  public classes: string | null = null;

  override render() {
    return html`
      <slot name="prompt"></slot>
      <div class="match-sets">
        <slot></slot>
      </div>
    `;
  }
}
customElements.define('qti-match-interaction', QtiMatchInteractionEdit);
