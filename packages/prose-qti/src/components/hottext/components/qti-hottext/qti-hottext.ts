import { css, html, LitElement } from 'lit';

import { translateQti } from '../../../shared';

export const HOTTEXT_RADIO_CLICK_EVENT = 'qti-hottext-radio-click';
export const HOTTEXT_REMOVE_EVENT = 'qti-hottext-remove';

export interface HottextRadioClickDetail {
  identifier: string;
}

export class QtiHottextEdit extends LitElement {
  static override styles = css`
    :host {
      white-space: nowrap;
    }

    [part='remove'] {
      opacity: 0.65;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      padding: 0;
      border: none;
      border-radius: 999px;
      background: color-mix(in srgb, currentColor 12%, white);
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 0.8em;
      line-height: 1;
      transition:
        opacity 120ms ease,
        background 120ms ease;
    }

    :host(:hover) [part='remove'],
    :host(:focus-within) [part='remove'],
    [part='remove']:hover,
    [part='remove']:focus-visible {
      opacity: 1;
    }

    [part='remove']:hover {
      background: color-mix(in srgb, #dc2626 18%, white);
    }
  `;

  #internals = this.attachInternals();

  setChecked(checked: boolean): void {
    if (checked) {
      this.#internals.states.add('--checked');
    } else {
      this.#internals.states.delete('--checked');
    }
  }

  setRole(role: 'radio' | 'checkbox'): void {
    this.#internals.states.delete(role === 'radio' ? 'checkbox' : 'radio');
    this.#internals.states.add(role);
  }

  #handleRadioMousedown = (e: MouseEvent) => {
    e.preventDefault();
  };

  #handleRadioClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<HottextRadioClickDetail>(HOTTEXT_RADIO_CLICK_EVENT, {
        bubbles: true,
        composed: true,
        detail: { identifier: this.getAttribute('identifier') ?? '' },
      }),
    );
  };

  #handleRemoveClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(HOTTEXT_REMOVE_EVENT, {
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    return html`
      <div part="ch" @mousedown=${this.#handleRadioMousedown} @click=${this.#handleRadioClick}>
        <div part="cha"></div>
      </div>
      <slot></slot>
      <button
        part="remove"
        type="button"
        title=${translateQti('hottext.remove', { target: this })}
        aria-label=${translateQti('hottext.remove', { target: this })}
        @mousedown=${this.#handleRadioMousedown}
        @click=${this.#handleRemoveClick}
      >
        ×
      </button>
    `;
  }
}
