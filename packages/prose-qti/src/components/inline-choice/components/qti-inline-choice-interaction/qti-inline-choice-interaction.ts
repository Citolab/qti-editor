import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

import { MenuAutoSizeMixin } from '@qti-components/interactions-core/mixins/menu-auto-size';

import {
  InteractionPanel,
  QtiI18nController,
  QTI_CORRECT_RESPONSE_TOGGLE_EVENT,
  type QtiCorrectResponseToggleDetail,
} from '../../../shared';
import styles from './qti-inline-choice-interaction.styles.js';

/**
 * Editor component for qti-inline-choice-interaction — a dropdown embedded in running text,
 * holding `qti-inline-choice` options.
 *
 * @customElement qti-inline-choice-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `identifier` and single
 * cardinality — an inline choice always takes exactly one answer.
 * @attr {string} data-prompt - Editor-specific. Custom text rendered while the selection is in
 * its unselected state. When unset, the platform default placeholder is used.
 * @attr {string} correct-response - Answer key held on the element while authoring. The
 * `identifier` of the single correct `qti-inline-choice`. Converted to and from
 * `qti-correct-response` on import/export.
 */
export class QtiInlineChoiceInteraction extends MenuAutoSizeMixin(InteractionPanel) {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };

  static override styles = styles;

  private readonly internals = this.attachInternals();

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

  protected override shouldClosePanelOnOutsidePointerDown(): boolean {
    return true;
  }

  /**
   * Keep the trigger wide enough for the longest choice. The mixin writes to the trigger inside
   * this element's shadow root, so ProseMirror never sees an unsupported host style attribute.
   */
  override shouldAutoSizeMenu(): boolean {
    return true;
  }

  /**
   * Stand-ins for whichever rows are light DOM, so #measure() never touches the real ones.
   *
   * The mixin's own #measure() reads a row's width by setting its `style.width` and reading it
   * back — safe for a row that lives in this element's shadow root (the placeholder option), but
   * the slotted `qti-inline-choice` choices are ProseMirror-managed light DOM. A `style` attribute
   * PM's schema doesn't declare is exactly the mutation its DOMObserver reconciles away, which
   * re-fires this element's slotchange, which asks to measure again — a loop that never lets PM or
   * Lit settle. `this.contains(row)` is true only for the real light-DOM choices (a shadow-root
   * child is a different tree, so the host never "contains" it), so only those get cloned into the
   * sandbox; the shadow-native placeholder is returned as-is.
   */
  override menuAutoSizeRows(): HTMLElement[] {
    const sandbox = this.#measureSandbox;
    if (!sandbox) return super.menuAutoSizeRows();

    return super
      .menuAutoSizeRows()
      .map(row => (this.contains(row) ? sandbox.appendChild(row.cloneNode(true) as HTMLElement) : row));
  }

  /** Discards this pass's clones once the mixin is done reading them. */
  override withMenuMeasurable<T>(measure: () => T): T {
    try {
      return super.withMenuMeasurable(measure);
    } finally {
      this.#measureSandbox?.replaceChildren();
    }
  }

  get #measureSandbox(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="measure-sandbox"]') ?? null;
  }

  protected override onPanelOpenChanged(open: boolean): void {
    if (open) this.internals.states.add('open');
    else this.internals.states.delete('open');

    if (open) return;

    // `delegatesFocus` makes the trigger the active element inside the shadow root. Blur both
    // layers so the interaction does not retain its focused styling after an outside click.
    const activeElement = this.shadowRoot?.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    this.blur();
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
      <div
        id="inline-choice-menu"
        part="menu"
        role="listbox"
        popover="manual"
        ?data-open=${this._panelOpen}
      >
        <button part="option" type="button" role="option">
          <span part="option-content">${this.dataPrompt ?? this.i18n.t('inlineChoice.emptyOption')}</span>
        </button>
        <slot @slotchange=${this.#onChoicesSlotChange}></slot>
      </div>
      <!--
        MenuAutoSizeMixin's own #measure() reads a row's width by writing \`style.width\` on it and
        reading it back. Fine on the runtime's plain DOM; here the rows are the slotted
        \`qti-inline-choice\` elements, which are ProseMirror-managed light DOM. A style attribute
        PM's schema doesn't know is exactly the mutation its DOMObserver reconciles away, which
        re-fires this element's slotchange, which asks to measure again — an infinite loop. This
        sandbox holds throwaway clones instead, so the mixin has something it can mutate freely; see
        menuAutoSizeRows() below.
      -->
      <div part="measure-sandbox"></div>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, this.#handleCorrectResponseToggle);
    void this.updateComplete.then(() => {
      if (this.isConnected) this.updateMenuWidth();
    });
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
    if (changedProperties.has('_panelOpen')) this.#syncPopover();
    if (changedProperties.has('correctResponse')) {
      this.#syncSelectedChoices();
    }
  }

  #syncPopover() {
    const menu = this.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
    if (!menu) return;

    if (this._panelOpen) {
      if (!menu.matches(':popover-open')) menu.showPopover?.();
    } else if (menu.matches(':popover-open')) {
      menu.hidePopover?.();
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

  #onChoicesSlotChange = () => {
    this.#syncSelectedChoices();
    this.updateMenuWidth();
  };
}
