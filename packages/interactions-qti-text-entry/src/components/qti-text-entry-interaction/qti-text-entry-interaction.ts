import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { createRef } from 'lit/directives/ref.js';
import { Interaction } from '@qti-editor/interactions-shared/components/interaction.js';

import styles from '@qti-components/text-entry-interaction/styles';


import type { CSSResultGroup } from 'lit';
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

  override render() {
    return html`<input
      part="input"
      spellcheck="false"
      autocomplete="off"
      @keydown="${(event: KeyboardEvent) => event.stopImmediatePropagation()}"
      type="${this.patternMask == '[0-9]*' ? 'number' : 'text'}"
      placeholder="${ifDefined(this.placeholderText ? this.placeholderText : undefined)}"
      pattern="${ifDefined(this.patternMask ? this.patternMask : undefined)}"
      maxlength=${1000}
      readonly
    />`;
  }
}

customElements.define('qti-text-entry-interaction', QtiTextEntryInteractionEdit);
