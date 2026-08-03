import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

import { Interaction } from '../../../shared/components/interaction.js';
import { translateQti } from '../../../shared';
import { HOTTEXT_WRAP_SELECTION_EVENT } from '../../extensions/wrap-selection.js';
import {
  HOTTEXT_RADIO_CLICK_EVENT,
  HOTTEXT_REMOVE_EVENT,
  type HottextRadioClickDetail,
  type QtiHottextEdit,
} from '../qti-hottext/qti-hottext.js';
import styles from './qti-hottext-interaction.styles.js';
import { parseCorrectResponse } from '../../utils/parse-correct-response.js';

/**
 * Editor component for qti-hottext-interaction — a passage in which selected words are wrapped
 * in `qti-hottext` elements the candidate can pick.
 *
 * @customElement qti-hottext-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `identifier`.
 * @attr {number} max-choices - Maximum number of hottexts the candidate may select. `1` is a
 * single-response item, `0` means unlimited.
 * @attr {number} min-choices - Minimum number of hottexts the candidate must select before the
 * interaction counts as answered.
 * @attr {string} correct-response - Answer key held on the element while authoring. The
 * `identifier` of each correct `qti-hottext`, comma-separated (`ht_door,ht_langs`); order is not
 * significant. Converted to and from `qti-correct-response` on import/export.
 */
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

  /**
   * The hottext the caret currently sits in, if any — the subject of the popover's actions.
   *
   * Both of a hottext's authoring actions used to live in the text: a × in every word, and a radio
   * revealed by the caret. The × was permanent clutter and the radio reflowed the sentence when it
   * appeared, so both moved into the popover, keyed off this.
   */
  @state()
  private _removeTarget: HTMLElement | null = null;

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

  /**
   * Every authoring action for a hottext lives in this popover, and nothing lives in the text.
   *
   * The radio used to sit inside the word, revealed by the caret. Showing it widened the inline box,
   * so the sentence reflowed the moment it appeared — an inline control cannot avoid that. Marking
   * costs the same two clicks here (into the word, then the button) as it did there (into the word
   * to reveal, then the radio), so nothing was lost by moving it, and the text no longer moves.
   *
   * Which hottext is marked stays readable at rest without any control: the theme paints a checked
   * one with --qti-selected-bg / --qti-selected-color, exactly as the candidate will see it.
   */
  override render() {
    const target = this._removeTarget;
    const marked =
      !!target &&
      parseCorrectResponse(this.correctResponse).includes(target.getAttribute('identifier') ?? '');

    // Selected text outside a hottext makes one; a caret inside one marks or removes it. Mutually
    // exclusive by construction — see #syncSelectionState.
    const actions = this._selectedText
      ? [{ key: 'hottext.selection.wrap', handler: this.#wrapCurrentSelection }]
      : target
        ? [
            { key: marked ? 'hottext.unmark' : 'hottext.mark', handler: this.#toggleCurrentHottext },
            { key: 'hottext.remove', handler: this.#removeCurrentHottext },
          ]
        : [];

    return html`
      ${actions.length
        ? html`
            <div part="selection-menu" style="top:${this._menuPos.top}px;left:${this._menuPos.left}px">
              ${actions.map(
                action => html`
                  <button part="selection-action" type="button" @mousedown=${action.handler}>
                    ${translateQti(action.key, { target: this })}
                  </button>
                `,
              )}
            </div>
          `
        : null}
      <slot @slotchange=${this.#syncHottextStates}></slot>
    `;
  }

  /**
   * Mark or unmark the caret's hottext. Dispatches the same event the in-word radio used to, so the
   * toggle logic in #handleClick — which also decides radio vs checkbox cardinality — stays the one
   * place that owns it.
   */
  #toggleCurrentHottext = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = this._removeTarget;
    const identifier = target?.getAttribute('identifier');
    if (!target || !identifier) return;

    target.dispatchEvent(
      new CustomEvent<HottextRadioClickDetail>(HOTTEXT_RADIO_CLICK_EVENT, {
        bubbles: true,
        composed: true,
        detail: { identifier },
      }),
    );
  };

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

    // The caret deliberately stays put, so the popover stays open and its label flips to "Unmark" —
    // marking and un-marking are then the same button, and the word repainting purple underneath is
    // immediate feedback. (This used to clear the caret, which was there to dismiss the in-word
    // radio; with the radio gone that would just close the popover out from under the author.)
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

  /**
   * Remove the hottext the caret sits in.
   *
   * Dispatched ON the hottext element rather than on the interaction, because the plugin that does
   * the unwrapping resolves its target with `event.target.closest('qti-hottext')` — the same path the
   * × used to take. Nothing in wrap-selection.ts had to change.
   */
  #removeCurrentHottext = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = this._removeTarget;
    if (!target) return;

    target.dispatchEvent(new CustomEvent(HOTTEXT_REMOVE_EVENT, {
      bubbles: true,
      composed: true,
    }));
    this.#setRemoveTarget(null);
    requestAnimationFrame(() => {
      document.getSelection()?.removeAllRanges();
    });
  };

  #syncSelectionState() {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this._selectedText = '';
      this.#setRemoveTarget(null);
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
    const wrappingHottext = (range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    )?.closest('qti-hottext');

    // Mutually exclusive: outside a hottext with text selected -> offer to make one; inside a
    // hottext (caret is enough, no selection needed) -> offer to remove it.
    const text = inside && !wrappingHottext ? selection.toString().trim() : '';
    const removeTarget =
      inside && wrappingHottext instanceof HTMLElement ? wrappingHottext : null;

    if (text || removeTarget) {
      // A collapsed caret still has a rect, so this positions the popover for both actions.
      const rect = range.getBoundingClientRect();
      const top = rect.bottom + 6;
      const left = rect.left;
      if (top !== this._menuPos.top || left !== this._menuPos.left) {
        this._menuPos = { top, left };
      }
    }
    this._selectedText = text;
    this.#setRemoveTarget(removeTarget);
  }

  /** The hottext the caret is in, which is what the popover offers its actions for. */
  #setRemoveTarget(next: HTMLElement | null) {
    if (this._removeTarget === next) return;
    this._removeTarget = next;
  }
}
