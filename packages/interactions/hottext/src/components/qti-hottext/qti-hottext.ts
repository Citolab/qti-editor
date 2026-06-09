import { css, html, LitElement } from 'lit';
import { translateQti } from '@qti-editor/interaction-shared';

export const HOTTEXT_RADIO_CLICK_EVENT = 'qti-hottext-radio-click';
export const HOTTEXT_REMOVE_EVENT = 'qti-hottext-remove';

export interface HottextRadioClickDetail {
  identifier: string;
}

export class QtiHottextEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: baseline;
      gap: 0.25em;
      border-radius: 0.45rem;
      background: color-mix(in srgb, #f59e0b 10%, transparent);
      box-shadow: inset 0 0 0 1.5px color-mix(in srgb, #f59e0b 60%, transparent);
      cursor: pointer;
      font-weight: 600;
      padding: 0.35em 0.45em !important;
      transition:
        background 120ms ease,
        box-shadow 120ms ease;
    }

    :host(:hover) {
      background: color-mix(in srgb, #f59e0b 18%, transparent);
      box-shadow: inset 0 0 0 1.5px color-mix(in srgb, #f59e0b 80%, transparent);
    }

    [part='ch'] {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 0.75em;
      height: 0.75em;
      border: 1.5px solid color-mix(in srgb, #f59e0b 90%, currentColor);
      border-radius: 50%;
      box-sizing: border-box;
      margin-top: 0.15em;
      transition:
        background 120ms ease,
        border-color 120ms ease;
    }

    [part='cha'] {
      width: 0.4em;
      height: 0.4em;
      border-radius: 50%;
      background: transparent;
      transition: background 120ms ease;
    }

    :host([selected]) [part='ch'] {
      border-color: #16a34a;
    }

    :host([selected]) [part='cha'] {
      background: #16a34a;
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

    :host(:focus-within) {
      outline: 2px solid color-mix(in srgb, #2563eb 45%, transparent);
      outline-offset: 2px;
    }
  `;

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
