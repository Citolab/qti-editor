import { html, LitElement } from 'lit';


import styles from './qti-hottext.styles.js';

import type { CSSResultGroup } from 'lit';

export const HOTTEXT_RADIO_CLICK_EVENT = 'qti-hottext-radio-click';
export const HOTTEXT_REMOVE_EVENT = 'qti-hottext-remove';

export interface HottextRadioClickDetail {
  identifier: string;
}

/**
 * Editor component for qti-hottext — one selectable word or phrase inside a
 * `qti-hottext-interaction` passage.
 *
 * @customElement qti-hottext
 * @attr {string} identifier - Required. Identifies this hottext within its interaction; it is
 * the value that appears in the interaction's answer key and in the candidate's response. Read
 * straight off the element by the parent interaction, so it is not a reactive property here.
 */
export class QtiHottextEdit extends LitElement {
  static override styles: CSSResultGroup = styles;

  #internals = this.attachInternals();

  setChecked(checked: boolean): void {
    if (checked) {
      this.#internals.states.add('checked');
    } else {
      this.#internals.states.delete('checked');
    }
  }

  setRole(role: 'radio' | 'checkbox'): void {
    this.#internals.states.delete(role === 'radio' ? 'checkbox' : 'radio');
    this.#internals.states.add(role);
  }

  override render() {
    return html`
      <div part="control">
        <div part="control-mark"></div>
      </div>
      <slot part="label"></slot>
    `;
  }
}
