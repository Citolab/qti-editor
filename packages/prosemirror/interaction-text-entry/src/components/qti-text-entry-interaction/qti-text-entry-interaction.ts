import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { createRef } from 'lit/directives/ref.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';

import styles from '@qti-components/text-entry-interaction/styles';

export class QtiTextEntryInteractionEdit extends Interaction {
  static override get styles() {
    return [
      styles,
      css`
        :host {
          white-space: nowrap;
        }

        /* Lighten placeholder text */
        [part="input"] {
          color: hsl(var(--muted-foreground, 220 9% 56%));
          font-style: italic;
        }
      `
    ];
  }
  inputRef = createRef<HTMLInputElement>();

  @property({ type: String, attribute: 'pattern-mask' }) accessor patternMask = '';

  @property({ type: String, attribute: 'placeholder-text' }) accessor placeholderText = '';

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

if (!customElements.get('qti-text-entry-interaction')) {
  customElements.define('qti-text-entry-interaction', QtiTextEntryInteractionEdit);
}
