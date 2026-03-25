import { css, html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';

import styles from '@qti-components/inline-choice-interaction/styles';


let inlineChoiceMenuCounter = 0;

export class QtiInlineChoiceInteraction extends Interaction {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

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

  @state()
  _dropdownOpen = false;

  private readonly _menuId = `qti-inline-choice-menu-${inlineChoiceMenuCounter++}`;

  override render() {
    return html`
      <button
        part="trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded="${this._dropdownOpen ? 'true' : 'false'}"
        aria-controls="${this._menuId}"
        popovertarget="${this._menuId}"
        popovertargetaction="toggle"
      >
        <span part="value">Klik om opties in te vullen</span>
        <span part="dropdown-icon" aria-hidden="true">▾</span>
      </button>
      <div id="${this._menuId}" part="menu" role="listbox" popover="auto">
        <button part="option" type="button" role="option">
          <span part="option-content">vul hieronder de opties in</span>
        </button>
        <slot @slotchange=${this.#onChoicesSlotChange}></slot>
      </div>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.#estimateOptimalWidth();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
  }

  #estimateOptimalWidth() {
    // const trigger = this.renderRoot.querySelector<HTMLElement>('button[part="trigger"]');
    // let widthPx = 0;
    // if (widthPx <= 0 && trigger) {
    //   widthPx = trigger.getBoundingClientRect().width;
    // }
    // if (widthPx <= 0) return;
    // const fontSize = parseFloat(getComputedStyle(this).fontSize || '16') || 16;
    // const widthEm = Math.min(Math.max(widthPx / fontSize, 8.75), 40);
    // this.style.setProperty('--qti-calculated-min-width', `${widthEm}em`);
  }

  #onChoicesSlotChange = () => {
    this.#estimateOptimalWidth();
  };
}

if (!customElements.get('qti-inline-choice-interaction')) {
  customElements.define('qti-inline-choice-interaction', QtiInlineChoiceInteraction);
}
