import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  InteractionPanel,
  QtiI18nController,
  QTI_CORRECT_RESPONSE_TOGGLE_EVENT,
  type QtiCorrectResponseToggleDetail,
} from '../../../shared';
import styles from './qti-inline-choice-interaction.styles.js';


export class QtiInlineChoiceInteraction extends InteractionPanel {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };

  static override styles = styles;

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
      <!--
        Always rendered, open or shut. The menu is what sizes the trigger — it is an in-flow grid
        item whose widest option sets the value track — and a list that is not in the DOM sizes
        nothing. Open/closed is therefore a paint toggle (\`visibility\`, in the styles) rather than
        a render toggle, which is what it used to be.
      -->
      <div part="menu" role="listbox" ?data-open=${this._panelOpen}>
        <button part="option" type="button" role="option">
          <span part="option-content">${this.dataPrompt ?? this.i18n.t('inlineChoice.emptyOption')}</span>
        </button>
        <slot @slotchange=${this.#onChoicesSlotChange}></slot>
      </div>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, this.#handleCorrectResponseToggle);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, this.#handleCorrectResponseToggle);
  }

  /**
   * A child option toggled its selected state. Ask the editor to persist the
   * single `correctResponse` identifier onto this interaction node via the
   * shared node-attrs-sync plugin.
   */
  #handleCorrectResponseToggle = (event: Event) => {
    const detail = (event as CustomEvent<QtiCorrectResponseToggleDetail>).detail;
    const correctResponse = detail.selected ? detail.identifier : null;

    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        detail: {
          nodeType: 'qtiInlineChoiceInteraction',
          tagName: 'qti-inline-choice-interaction',
          attrs: { correctResponse },
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

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

  /*
   * `#estimateOptimalWidth` used to live here, entirely commented out.
   *
   * Its one live statement was `this.style.setProperty('--qti-calculated-min-width', …)` — a style
   * attribute written onto the HOST, which inside the editor is a ProseMirror-managed node. PM
   * reverts an attribute its schema does not know, the revert re-renders the node, and the
   * re-render re-runs the code that wrote it. That is the freeze, and disabling the method was the
   * workaround.
   *
   * The trigger is now sized by the menu through the grid, so there is nothing left to write and
   * nothing for ProseMirror to revert. See qti-inline-choice-interaction.styles.ts.
   */

  #onChoicesSlotChange = () => {
    this.#syncSelectedChoices();
  };
}
