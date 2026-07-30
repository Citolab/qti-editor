import { css, html, LitElement } from 'lit';

import { QtiHottext } from '@qti-components/interactions-core';

import { translateQti } from '../../../shared';

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
     * Editor-only additions. Everything else — the host box, its padding, the selection paint — is
     * inherited from the runtime styles above so authoring matches delivery.
     *
     * Two things exist here that have no counterpart at runtime:
     *
     *   [part=control]  the radio/checkbox the AUTHOR clicks to mark the correct response. Upstream
     *                   hides it outright (every theme variant draws selection on the word itself),
     *                   so the editor has to bring it back and give it a look of its own.
     *   [part=remove]   the × that deletes the hottext. Purely an authoring action.
     *
     * "white-space: nowrap" keeps the word, its radio and its × on one line; upstream has no reason
     * to care because it renders neither of the other two.
     */
    :host {
      white-space: nowrap;
      gap: 0.25rem;
    }

    /*
     * Undo upstream's "display: none" — see above — and paint the control the way qti-theme paints
     * every other radio/checkbox. The theme does this with mixins that PostCSS expands; a lit css
     * template cannot run them, so the same slots are written out longhand:
     *
     *   radio / checkbox   the paint contract + --qti-control-size, radius 100% for a radio
     *   mark-size          the resting mark box, a fraction of the control
     *   control-selected   checked fill: border AND background go to the accent
     *   radio-checked      the dot: half the control, --radio-mark-color (white at rest)
     *
     * Overriding --radio-* or --qti-component-* therefore reaches the editor's control exactly as it
     * reaches the runtime's.
     */
    [part='control'] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-sizing: border-box;
      cursor: pointer;

      width: var(--qti-control-size);
      height: var(--qti-control-size);

      /* paint: radio */
      background-color: var(--radio-background-color, var(--qti-component-background-color));
      border-width: var(--radio-border-width, var(--qti-component-border-width));
      border-style: var(--radio-border-style, var(--qti-component-border-style));
      border-color: var(--radio-border-color, var(--qti-component-border-color));
      border-radius: var(--radio-border-radius, 100%);
    }

    :host(:state(checkbox)) [part='control'] {
      background-color: var(--checkbox-background-color, var(--qti-component-background-color));
      border-color: var(--checkbox-border-color, var(--qti-component-border-color));
      border-radius: var(--checkbox-border-radius, var(--qti-component-border-radius));
    }

    /* mark-size */
    [part='control-mark'] {
      width: calc(var(--qti-control-size) * 0.625);
      height: calc(var(--qti-control-size) * 0.625);
      background-color: transparent;
    }

    /* control-selected */
    :host(:state(checked)) [part='control'] {
      border-color: var(--qti-border-active);
      background-color: var(--qti-border-active);
    }

    /* radio-checked */
    :host(:state(checked)) [part='control-mark'] {
      width: calc(var(--qti-control-size) * 0.5);
      height: calc(var(--qti-control-size) * 0.5);
      background-color: var(--radio-mark-color, white);
      border-radius: 100%;
    }

    :host(:state(checkbox):state(checked)) [part='control-mark'] {
      background-color: var(--checkbox-mark-color, white);
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
      <div part="control" @mousedown=${this.#handleRadioMousedown} @click=${this.#handleRadioClick}>
        <div part="control-mark"></div>
      </div>
      <slot part="label"></slot>
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
