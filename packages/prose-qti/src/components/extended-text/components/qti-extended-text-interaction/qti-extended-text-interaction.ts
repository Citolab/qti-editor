import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction } from '../../../shared/components/interaction.js';
import styles from './qti-extended-text-interaction.styles.js';

/**
 * Editor component for qti-extended-text-interaction — a free-prose response area.
 *
 * @customElement qti-extended-text-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `string`.
 * @attr {number} expected-length - Hint to the delivery engine for how many characters the
 * response is expected to run to. Advisory only; it does not limit input.
 * @attr {number} expected-lines - Hint for how many lines the response is expected to run to.
 * Drives the height of the input area unless a `qti-height-lines-N` class overrides it.
 * @attr {string} placeholder-text - Text shown in the empty input area. Guidance for the
 * candidate, never part of the response.
 * @attr {string} pattern-mask - Regular expression the response must match before it is
 * accepted.
 * @attr {string} class - Shared interaction vocabulary, e.g. `qti-height-lines-N` for the
 * height of the input area and the plain/rich-text and character-counter classes.
 * @attr {string} correct-response - Model answer held on the element while authoring, NOT a
 * machine-scorable key — free prose has nothing to compare against. Converted to and from
 * `qti-correct-response` on import/export.
 */
export class QtiExtendedTextInteractionEdit extends Interaction {
  static override styles = styles;

  @property({ type: Number, attribute: 'expected-length' })
  expectedLength: number | null = null;

  @property({ type: Number, attribute: 'expected-lines' })
  expectedLines: number | null = null;

  @property({ type: String, attribute: 'placeholder-text' })
  placeholderText: string | null = null;

  @property({ type: String, attribute: 'pattern-mask' })
  patternMask: string | null = null;

  @property({ type: String, attribute: 'class' })
  classNames: string | null = null;

  // Mirrors @qti-components/extended-text-interaction: default 5 rows; a
  // `qti-height-lines-N` class wins, then expectedLines, then an estimate from
  // expectedLength at ~50 chars/row.
  private get _rows(): number {
    const cls = this.classNames ?? '';
    for (const c of cls.split(' ')) {
      if (c.startsWith('qti-height-lines-')) {
        const n = parseInt(c.slice('qti-height-lines-'.length), 10);
        if (!Number.isNaN(n)) return n;
      }
    }
    if (this.expectedLines) return this.expectedLines;
    if (this.expectedLength) return Math.ceil(this.expectedLength / 50);
    return 5;
  }

  override render() {
    return html`<slot name="prompt"></slot><textarea
      part="textarea"
      inert
      spellcheck="false"
      autocomplete="off"
      rows=${this._rows}
      .placeholder=${this.placeholderText ?? ''}
    ></textarea>`;
  }
}
