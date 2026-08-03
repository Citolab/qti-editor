import { html, LitElement, type CSSResultGroup } from 'lit';

import { QtiPrompt } from '@qti-components/interactions-core';

/**
 * Editor component for qti-prompt — the question text of an interaction. Placed inside an
 * interaction it assigns itself to that interaction's `prompt` slot; in the item body it simply
 * renders where it stands.
 *
 * The element carries no attributes of its own; its content is the prompt.
 *
 * @customElement qti-prompt
 */
export class QtiPromptEdit extends LitElement {
  /**
   * Upstream's, with nothing added — the local qti-prompt.styles.ts was a character-for-character
   * copy of it, so the only thing the copy could do was drift. Taken off the class, through the
   * package root, because the local-link aliases bind whole specifiers: a deep
   * `elements/qti-prompt/qti-prompt.styles.js` path resolves to the published dist even in
   * source-link mode.
   */
  static override styles: CSSResultGroup = QtiPrompt.styles;

  override render() {
    return html`<slot></slot>`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // if prompts are in interactions they should have a slot, so the prompt has to go there
    // if prompt is in the body, then just display the prompt there.
    // A better check would be the latter, but not can't get through the shadowroot to find the slot
    const inInteraction = this.parentElement?.tagName.endsWith('INTERACTION') ?? false;
    if (inInteraction) {
      this.setAttribute('slot', 'prompt');
    }
    // const promptSlot = this.parentElement.shadowRoot.querySelector("[name='prompt']");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-prompt-edit': QtiPromptEdit;
  }
}
