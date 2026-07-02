import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction } from '../../../shared/components/interaction.js';
import styles from './qti-extended-text-interaction.styles.js';

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
