import { css, html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction } from '@citolab/prose-qti/components/shared/components/interaction.js';
import styles from '@citolab/prose-qti/core-css';

import type { CSSResultGroup } from 'lit';

export class QtiTextEntryInteractionEdit extends Interaction {
  static override styles: CSSResultGroup = [
    styles,
    css`
      :host {
        white-space: nowrap;
        position: relative;
      }

      [part="input"]::placeholder {
        color: hsl(var(--muted-foreground, 220 9% 56%));
        font-style: italic;
      }
    `
  ];

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
