import { css, html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { QtiI18nController } from '@qti-editor/interaction-shared';

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
        [part='value'].is-correct {
          color: #16a34a;
          font-weight: 500;
        }
      `
    ];
  }

  @state()
  _dropdownOpen = false;

  @state()
  private _correctChoiceText: string | null = null;

  private readonly i18n = new QtiI18nController(this);

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
        <span
          part="value"
          class=${this._correctChoiceText ? 'is-correct' : ''}
        >${this._correctChoiceText ?? this.i18n.t('inlineChoice.placeholder')}</span>
        <span part="dropdown-icon" aria-hidden="true">▾</span>
      </button>
      <div id="${this._menuId}" part="menu" role="listbox" popover="auto">
        <button part="option" type="button" role="option">
          <span part="option-content">${this.i18n.t('inlineChoice.emptyOption')}</span>
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

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      this.#syncSelectedChoices();
    }
  }

  #syncSelectedChoices() {
    const identifiers = new Set(
      typeof this.correctResponse === 'string' && this.correctResponse
        ? this.correctResponse.includes(',')
          ? this.correctResponse.split(',')
          : [this.correctResponse]
        : Array.isArray(this.correctResponse)
          ? this.correctResponse
          : [],
    );
    let correctText: string | null = null;
    this.querySelectorAll<HTMLElement & { setSelected?: (v: boolean) => void; identifier?: string }>(
      'qti-inline-choice',
    ).forEach(choice => {
      const isSelected = identifiers.has(choice.identifier ?? '');
      choice.setSelected?.(isSelected);
      if (isSelected && correctText === null) {
        correctText = (choice.textContent ?? '').trim() || null;
      }
    });
    this._correctChoiceText = correctText;
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
    this.#syncSelectedChoices();
  };
}

if (!customElements.get('qti-inline-choice-interaction')) {
  customElements.define('qti-inline-choice-interaction', QtiInlineChoiceInteraction);
}
