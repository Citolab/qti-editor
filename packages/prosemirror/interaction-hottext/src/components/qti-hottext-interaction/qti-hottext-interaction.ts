import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { translateQti } from '@qti-editor/interaction-shared';

import { HOTTEXT_WRAP_SELECTION_EVENT } from '../../extensions/wrap-selection.js';
import styles from './qti-hottext-interaction.styles.js';

function parseCorrectResponse(value: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map(entry => String(entry).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

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
    this.addEventListener('click', this.#handleClick);
    document.addEventListener('mouseup', this.#handleMouseUp);
    document.addEventListener('keyup', this.#handleKeyUp);
  }

  override disconnectedCallback() {
    this.removeEventListener('click', this.#handleClick);
    document.removeEventListener('mouseup', this.#handleMouseUp);
    document.removeEventListener('keyup', this.#handleKeyUp);
    super.disconnectedCallback();
  }

  override updated() {
    this.#syncSelectedState();
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
      <slot @slotchange=${this.#handleSlotChange}></slot>
    `;
  }

  #handleSlotChange = () => {
    this.#syncSelectedState();
    this.#syncSelectionState();
  };

  #handleClick = (event: Event) => {
    const hottext = (event.target as Element | null)?.closest('qti-hottext');
    if (!(hottext instanceof HTMLElement) || !this.contains(hottext)) {
      return;
    }

    const identifier = hottext.getAttribute('identifier');
    if (!identifier) {
      return;
    }

    const selectedIdentifiers = parseCorrectResponse(this.correctResponse);
    const isSelected = selectedIdentifiers.includes(identifier);

    let nextIdentifiers: string[];
    if (isSelected) {
      nextIdentifiers = selectedIdentifiers.filter(value => value !== identifier);
    } else if (this.maxChoices === 1) {
      nextIdentifiers = [identifier];
    } else if (this.maxChoices > 1 && selectedIdentifiers.length >= this.maxChoices) {
      return;
    } else {
      nextIdentifiers = [...selectedIdentifiers, identifier];
    }

    const correctResponse = nextIdentifiers.length > 0 ? nextIdentifiers.join(',') : null;
    this.correctResponse = correctResponse;
    this.#syncSelectedState();
    this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
      bubbles: true,
      composed: true,
      detail: {
        nodeType: 'qtiHottextInteraction',
        tagName: 'qti-hottext-interaction',
        attrs: {
          correctResponse,
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
      this._menuPos = { top: rect.bottom + 6, left: rect.left };
    }
    this._selectedText = text;
  }

  #syncSelectedState() {
    const selected = new Set(parseCorrectResponse(this.correctResponse));
    for (const hottext of this.querySelectorAll('qti-hottext')) {
      const identifier = hottext.getAttribute('identifier');
      const isSelected = Boolean(identifier && selected.has(identifier));
      hottext.toggleAttribute('selected', isSelected);
      hottext.setAttribute('aria-pressed', String(isSelected));
    }
  }
}

if (!customElements.get('qti-hottext-interaction')) {
  customElements.define('qti-hottext-interaction', QtiHottextInteractionEdit);
}
