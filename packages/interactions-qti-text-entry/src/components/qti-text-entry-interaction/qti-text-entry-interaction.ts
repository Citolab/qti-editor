import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { createRef } from 'lit/directives/ref.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import styles from '@qti-components/text-entry-interaction/styles';

export class QtiTextEntryInteractionEdit extends Interaction {
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
  inputRef = createRef<HTMLInputElement>();

  @property({ type: String, attribute: 'pattern-mask' }) patternMask: string;

  @property({ type: String, attribute: 'placeholder-text' }) placeholderText: string;

  private _getPlaceholderText(): string {
    if (this.placeholderText) {
      return this.placeholderText;
    }
    return 'Candidate enters text response here...';
  }

  override render() {
    return html`<div part="input">
      ${this._getPlaceholderText()}
    </div>`;
  }
}

customElements.define('qti-text-entry-interaction', QtiTextEntryInteractionEdit);
