import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared';

import styles from '@qti-components/text-entry-interaction/styles';

export class QtiTextEntryInteractionEdit extends Interaction {
  static override get styles() {
    return [
      styles,
      css`
        :host {
          white-space: nowrap;
          position: relative;
        }

        /* Lighten placeholder text */
        [part="input"] {
          color: hsl(var(--muted-foreground, 220 9% 56%));
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `
    ];
  }

  @property({ type: String, attribute: 'pattern-mask' }) patternMask = '';

  @property({ type: String, attribute: 'placeholder-text' }) placeholderText = '';

  private _getPlaceholderText(): string {
    if (this.placeholderText) {
      return this.placeholderText;
    }
    // Reserve a sensible default width with 40 non-breaking spaces (invisible).
    return '\u00A0'.repeat(40);
  }

  override render() {
    return html`<div part="input">${this._getPlaceholderText()}</div>`;
  }
}
