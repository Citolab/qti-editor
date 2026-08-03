import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction } from '@citolab/prose-qti/components/shared/components/interaction.js';

import styles from './qti-text-entry-interaction.styles.js';

/**
 * Editor component for qti-text-entry-interaction — a single-line input embedded in running
 * text.
 *
 * @customElement qti-text-entry-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `string`.
 * @attr {string} pattern-mask - Regular expression the response must match before it is
 * accepted.
 * @attr {string} placeholder-text - Text shown in the empty input. Guidance for the candidate,
 * never part of the response.
 * @attr {string} correct-response - Answer key held on the element while authoring: the single
 * expected string. Matching is exact unless the response processing template folds case. A value
 * containing a comma cannot be expressed — the codec reads it as two answers, so use a mapping
 * in the response declaration for several accepted answers. Converted to and from
 * `qti-correct-response` on import/export.
 */
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
