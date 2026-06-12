import { css, html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { InteractionPanel, QtiI18nController } from '@qti-editor/interaction-shared';

import styles from '@qti-components/inline-choice-interaction/styles';

export class QtiInlineChoiceInteraction extends InteractionPanel {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };

  static override get styles() {
    return [
      styles,
      css`
        :host {
          position: relative; /* anchor for the absolute menu */
          white-space: nowrap;
        }
        [part='menu'] {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 10;
        }
      `
    ];
  }

  @state()
  private _correctChoiceText: string | null = null;

  /**
   * Custom text rendered while the selection is in its unselected state
   * (`data-prompt`). When unset, the platform default placeholder is used.
   */
  @property({ type: String, attribute: 'data-prompt' })
  dataPrompt: string | null = null;

  private readonly i18n = new QtiI18nController(this);

  protected override shouldOpenPanelOnPointerDown(): boolean {
    return false;
  }

  protected override shouldOpenPanelOnFocusIn(): boolean {
    return false;
  }

  protected override shouldOpenPanelOnSelectionChange(): boolean {
    return false;
  }

  override render() {
    return html`
      <button
        part="trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded="${this._panelOpen ? 'true' : 'false'}"
        @click=${this.togglePanel}
      >
        <span part="value" class=${this._correctChoiceText ? 'is-correct' : ''}
          >${this._correctChoiceText ?? this.dataPrompt ?? this.i18n.t('inlineChoice.placeholder')}</span
        >
        <span part="dropdown-icon" aria-hidden="true">▾</span>
      </button>
      ${this._panelOpen
        ? html`
            <div part="menu" role="listbox">
              <button part="option" type="button" role="option">
                <span part="option-content">${this.dataPrompt ?? this.i18n.t('inlineChoice.emptyOption')}</span>
              </button>
              <slot @slotchange=${this.#onChoicesSlotChange}></slot>
            </div>
          `
        : html`
            ${nothing}
            <slot @slotchange=${this.#onChoicesSlotChange} hidden></slot>
          `}
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
          : []
    );
    let correctText: string | null = null;
    this.querySelectorAll<HTMLElement & { setSelected?: (v: boolean) => void; identifier?: string }>(
      'qti-inline-choice'
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
