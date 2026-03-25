import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';

import styles from '@qti-components/extended-text-interaction/styles';


export class QtiExtendedTextInteractionEdit extends Interaction {
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


  @property({ type: Number, attribute: 'expected-length' })
  accessor expectedLength: number | null = null;

  @property({ type: Number, attribute: 'expected-lines' })
  accessor expectedLines: number | null = null;

  @property({ type: String, attribute: 'placeholder-text' })
  accessor placeholderText: string | null = null;

  @property({ type: String })
  accessor format: 'plain' | 'preformatted' | 'xhtml' = 'plain';

  @property({ type: String, attribute: 'pattern-mask' })
  accessor patternMask: string | null = null;

  @property({ type: Number })
  accessor base: number = 10;

  @property({ type: String, attribute: 'string-identifier' })
  accessor stringIdentifier: string | null = null;

  @property({ type: Number, attribute: 'max-strings' })
  accessor maxStrings: number | null = null;

  @property({ type: Number, attribute: 'min-strings' })
  accessor minStrings: number = 0;

  @property({ type: String, attribute: 'class' })
  accessor classes: string | null = null;

  private _getPlaceholderText(): string {
    if (this.placeholderText) {
      return this.placeholderText;
    }
    return 'Candidate enters extended text response here...';
  }

  override render() {
    return html`
      <slot name="prompt"></slot>
      <div part="textarea">
        ${this._getPlaceholderText()}
      </div>
    `;
  }
}
if (!customElements.get('qti-extended-text-interaction')) {
  customElements.define('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
}
