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

        /* QTI height classes for expectedLines support */
        :host(.qti-height-lines-3) [part="textarea"] {
          min-height: calc(3 * 1.5em + 1rem);
        }
        :host(.qti-height-lines-6) [part="textarea"] {
          min-height: calc(6 * 1.5em + 1rem);
        }
        :host(.qti-height-lines-15) [part="textarea"] {
          min-height: calc(15 * 1.5em + 1rem);
        }

        /* Lighten placeholder text */
        [part="textarea"] {
          color: hsl(var(--muted-foreground, 220 9% 56%));
          font-style: italic;
        }
      `
    ];
  }


  @property({ type: Number, attribute: 'expected-length' })
  expectedLength: number | null = null;

  @property({ type: Number, attribute: 'expected-lines' })
  expectedLines: number | null = null;

  @property({ type: String, attribute: 'placeholder-text' })
  placeholderText: string | null = null;

  @property({ type: String })
  format: 'plain' | 'preformatted' | 'xhtml' = 'plain';

  @property({ type: String, attribute: 'pattern-mask' })
  patternMask: string | null = null;

  @property({ type: Number })
  base: number = 10;

  @property({ type: String, attribute: 'string-identifier' })
  stringIdentifier: string | null = null;

  @property({ type: Number, attribute: 'max-strings' })
  maxStrings: number | null = null;

  @property({ type: Number, attribute: 'min-strings' })
  minStrings: number = 0;

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

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
