import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-extended-text-interaction.
 * Renders a textarea-like input for extended text responses.
 */
export class QtiExtendedTextInteractionEdit extends Interaction {
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
    .textarea-placeholder {
      width: 100%;
      min-height: 6em;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      padding: 0.75em;
      box-sizing: border-box;
      color: #999;
      font-style: italic;
      resize: vertical;
    }
    :host(.qti-height-lines-3) .textarea-placeholder {
      min-height: 3em;
    }
    :host(.qti-height-lines-6) .textarea-placeholder {
      min-height: 6em;
    }
    :host(.qti-height-lines-15) .textarea-placeholder {
      min-height: 15em;
    }
  `;

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
      <slot></slot>
      <div class="textarea-placeholder" style="${style}">
        ${this._getPlaceholderText()}
      </div>
    `;
  }
}
customElements.define('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
