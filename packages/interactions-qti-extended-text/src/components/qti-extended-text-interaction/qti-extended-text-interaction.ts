import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import styles from '@qti-components/extended-text-interaction/styles';

import type { CSSResultGroup } from 'lit';


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
  public expectedLength: number | null = null;

  @property({ type: Number, attribute: 'expected-lines' })
  public expectedLines: number | null = null;

  @property({ type: String, attribute: 'placeholder-text' })
  public placeholderText: string | null = null;

  @property({ type: String })
  public format: 'plain' | 'preformatted' | 'xhtml' = 'plain';

  @property({ type: String, attribute: 'pattern-mask' })
  public patternMask: string | null = null;

  @property({ type: Number })
  public base: number = 10;

  @property({ type: String, attribute: 'string-identifier' })
  public stringIdentifier: string | null = null;

  @property({ type: Number, attribute: 'max-strings' })
  public maxStrings: number | null = null;

  @property({ type: Number, attribute: 'min-strings' })
  public minStrings: number = 0;

  @property({ type: String, attribute: 'class' })
  public classes: string | null = null;

  private _getPlaceholderText(): string {
    if (this.placeholderText) {
      return this.placeholderText;
    }
    return 'Candidate enters extended text response here...';
  }

  private _getMinHeight(): string {
    if (this.expectedLines) {
      return `${this.expectedLines * 1.5}em`;
    }
    return '6em';
  }

  override render() {
    const style = this.expectedLines ? `min-height: ${this._getMinHeight()}` : '';
    return html`
      <slot name="prompt"></slot>
      <div part="textarea">
        ${this._getPlaceholderText()}
      </div>
    `;
  }
}
customElements.define('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
