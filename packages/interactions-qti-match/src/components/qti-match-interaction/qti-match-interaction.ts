import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import styles from '@qti-components/match-interaction/styles';

/**
 * Editor component for qti-match-interaction.
 * Renders two match sets side by side for creating associations.
 */
export class QtiMatchInteractionEdit extends Interaction {
  static override get styles() {
    return [
      styles,
      css`
        :host {
          white-space: nowrap;
        }
      `
    ];
  }

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
      <slot></slot>
    `;
  }
}
customElements.define('qti-match-interaction', QtiMatchInteractionEdit);
