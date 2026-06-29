import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction } from '@citolab/prose-qti/components/shared/components/interaction.js';

import styles from './qti-text-entry-interaction.styles.js';

export class QtiTextEntryInteractionEdit extends Interaction {
  static override styles = styles;

  @property({ type: String, attribute: 'pattern-mask' }) patternMask = '';

  @property({ type: String, attribute: 'placeholder-text' }) placeholderText = '';

  override render() {
    return html`<input
      part="input"
      inert
      spellcheck="false"
      autocomplete="off"
      type=${this.patternMask === '[0-9]*' ? 'number' : 'text'}
      .placeholder=${this.placeholderText || '\u00A0'.repeat(40)}
    />`;
  }
}
