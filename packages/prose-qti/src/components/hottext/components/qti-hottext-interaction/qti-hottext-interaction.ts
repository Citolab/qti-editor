import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

import { Interaction } from '../../../shared/components/interaction.js';
import { translateQti } from '../../../shared';
import { HOTTEXT_WRAP_SELECTION_EVENT } from '../../extensions/wrap-selection.js';
import {
  HOTTEXT_RADIO_CLICK_EVENT,
  type HottextRadioClickDetail,
  type QtiHottextEdit,
} from '../qti-hottext/qti-hottext.js';
import styles from './qti-hottext-interaction.styles.js';
import { parseCorrectResponse } from '../../utils/parse-correct-response.js';

export class QtiHottextInteractionEdit extends Interaction {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    styles,
  ];

  @property({ type: Number, attribute: 'max-choices' })
  maxChoices = 1;

  @property({ type: Number, attribute: 'min-choices' })
  minChoices = 0;

  @property({ type: String, attribute: false })
  private _selectedText = '';

  @state()
  private _menuPos = { top: 0, left: 0 };

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener(HOTTEXT_RADIO_CLICK_EVENT, this.#handleClick);
    document.addEventListener('mouseup', this.#handleMouseUp);
    document.addEventListener('keyup', this.#handleKeyUp);
    queueMicrotask(() => this.#syncHottextStates());
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse') || changedProperties.has('maxChoices')) {
      this.#syncHottextStates();
    }
  }

  #syncHottextStates = () => {
    const selectedIds = new Set(parseCorrectResponse(this.correctResponse));
    const role: 'radio' | 'checkbox' = this.maxChoices === 1 ? 'radio' : 'checkbox';
    this.querySelectorAll('qti-hottext').forEach(el => {
      const id = el.getAttribute('identifier');
      const hottext = el as unknown as QtiHottextEdit;
      hottext.setRole(role);
      hottext.setChecked(!!id && selectedIds.has(id));
    });
  };

  override disconnectedCallback() {
    this.removeEventListener(HOTTEXT_RADIO_CLICK_EVENT, this.#handleClick);
    document.removeEventListener('mouseup', this.#handleMouseUp);
    document.removeEventListener('keyup', this.#handleKeyUp);
    super.disconnectedCallback();
  }

  override render() {
    return html`
      ${this._selectedText
        ? html`
            <div part="selection-menu" style="top:${this._menuPos.top}px;left:${this._menuPos.left}px">
              <button
                part="selection-action"
                type="button"
                @mousedown=${this.#wrapCurrentSelection}
              >
                ${translateQti('hottext.selection.wrap', { target: this })}
              </button>
            </div>
          `
        : null}
      <slot @slotchange=${this.#syncHottextStates}></slot>
    `;
  }

  #handleClick = (event: Event) => {
    const { identifier } = (event as CustomEvent<HottextRadioClickDetail>).detail;
    if (!identifier) return;

    const selectedIdentifiers = parseCorrectResponse(this.correctResponse);
    const isSelected = selectedIdentifiers.includes(identifier);

    // Toggle the clicked hottext in/out of the correct response unconditionally,
    // mirroring qti-choice-interaction: selecting a second hottext switches the
    // interaction from single (max-choices=1) to unlimited (max-choices=0 →
    // cardinality multiple).
    const nextIdentifiers = isSelected
      ? selectedIdentifiers.filter(value => value !== identifier)
      : [...selectedIdentifiers, identifier];

    const correctResponse = nextIdentifiers.length > 0 ? nextIdentifiers.join(',') : null;
    const maxChoices = nextIdentifiers.length <= 1 ? 1 : 0;

    this.correctResponse = correctResponse;
    this.maxChoices = maxChoices;
    this.#syncHottextStates();
    this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
      bubbles: true,
      composed: true,
      detail: {
        nodeType: 'qtiHottextInteraction',
        tagName: 'qti-hottext-interaction',
        attrs: {
          correctResponse,
          maxChoices,
        },
      },
    }));
  };

  #handleMouseUp = () => {
    this.#syncSelectionState();
  };

  #handleKeyUp = () => {
    this.#syncSelectionState();
  };

  #wrapCurrentSelection = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!this._selectedText) {
      return;
    }

    this.dispatchEvent(new CustomEvent(HOTTEXT_WRAP_SELECTION_EVENT, {
      bubbles: true,
      composed: true,
    }));
    this._selectedText = '';
    // ProseMirror updates the browser selection asynchronously, so defer the clear
    requestAnimationFrame(() => {
      document.getSelection()?.removeAllRanges();
    });
  };

  #syncSelectionState() {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this._selectedText = '';
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    const inside =
      !!anchorNode &&
      !!focusNode &&
      this.contains(anchorNode) &&
      this.contains(focusNode);

    const range = selection.getRangeAt(0);
    const alreadyWrapped = !!(range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    )?.closest('qti-hottext');

    const text = inside && !alreadyWrapped ? selection.toString().trim() : '';
    if (text) {
      const rect = range.getBoundingClientRect();
      const top = rect.bottom + 6;
      const left = rect.left;
      if (top !== this._menuPos.top || left !== this._menuPos.left) {
        this._menuPos = { top, left };
      }
    }
    this._selectedText = text;
  }
}
