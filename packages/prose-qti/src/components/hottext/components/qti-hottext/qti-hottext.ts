import { css, html, LitElement } from 'lit';

import { QtiHottext } from '@qti-components/interactions-core';


import type { CSSResult, CSSResultGroup } from 'lit';

/**
 * The runtime hottext's own styles: box-sizing, and the `:host` box every theme paints against —
 * `display: inline-flex`, `align-items: center`, `position: relative` (the containing block for the
 * answer-key tick the theme draws as an absolutely positioned ::before) and the inline padding.
 *
 * This file used to declare `:host` from scratch and adopt one sheet where the runtime adopts two,
 * so the editor's hottext was `display: inline`, `position: static`, unaligned, and measured 129x43
 * against the runtime's 59x24.
 */
const hottextStyles = QtiHottext.styles as CSSResult;

export const HOTTEXT_RADIO_CLICK_EVENT = 'qti-hottext-radio-click';
export const HOTTEXT_REMOVE_EVENT = 'qti-hottext-remove';

export interface HottextRadioClickDetail {
  identifier: string;
}

export class QtiHottextEdit extends LitElement {
  static override styles: CSSResultGroup = [
    hottextStyles,
    css`
    /*
     * The editor adds NOTHING to a hottext's look. The host box, its padding, the border per variant
     * and the selected paint all come from the runtime styles above, so a hottext here is the word
     * the candidate will see — at rest and while editing.
     *
     * There was a radio in here, revealed by the caret, for marking the correct response. Showing it
     * widened the inline box and reflowed the sentence; every authoring action now lives in the
     * interaction's popover instead, where it cannot move the text. Upstream's own
     * "display: none" on the control stands, and the control stays in the tree for the
     * accessibility mapping exactly as upstream intends.
     *
     * nowrap keeps a multi-word hottext on one line.
     */
    :host {
      white-space: nowrap;
    }
  `
  ];

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
