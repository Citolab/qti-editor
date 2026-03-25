import { property, state } from 'lit/decorators.js';

import type { LitElement, PropertyValues } from 'lit';

/**
 * Event name for correct response selection changes.
 * Bubbles up to the parent interaction element.
 */
export const QTI_CORRECT_RESPONSE_TOGGLE_EVENT = 'qti:correct-response:toggle';

/**
 * Detail payload for the toggle event.
 */
export interface QtiCorrectResponseToggleDetail {
  identifier: string;
  selected: boolean;
}

type Constructor<T = {}> = abstract new (...args: any[]) => T;

/**
 * Interface for elements that use the CorrectResponseClickMixin.
 */
export interface CorrectResponseClickInterface {
  identifier: string;
  selected: boolean;
  internals: ElementInternals;
  handleControlClick(event: MouseEvent): void;
}

/**
 * Mixin that adds correct response click behavior to choice elements.
 * 
 * When the user clicks on the checkbox/radio control (part="ch"), 
 * this mixin toggles the selection state and dispatches an event
 * that bubbles up to the parent interaction.
 * 
 * The parent interaction aggregates selections and updates:
 * - `correctResponse`: comma-separated identifiers of selected choices
 * - `maxChoices`: 1 if single selection, 0 if multiple selections
 * 
 * Usage:
 * ```ts
 * class MyChoice extends CorrectResponseClickMixin(LitElement) {
 *   // Must have identifier attribute and internals
 * }
 * ```
 */
export const CorrectResponseClickMixin = <T extends Constructor<LitElement & { internals: ElementInternals }>>(
  superClass: T
) => {
  abstract class CorrectResponseClickElement extends superClass implements CorrectResponseClickInterface {
    /**
     * The identifier for this choice element.
     * Used as the value in correctResponse.
     * Note: Do NOT use reflect: true - ProseMirror manages this attribute.
     */
    @property({ type: String })
    accessor identifier = '';

    /**
     * Whether this choice is currently selected as a correct response.
     */
    @state()
    accessor selected = false;

    override updated(changedProperties: PropertyValues) {
      super.updated(changedProperties);
      
      // Sync CSS state with selected property
      if (changedProperties.has('selected')) {
        this._updateCheckedState();
      }
    }

    /**
     * Handle clicks on the checkbox/radio control area.
     * Call this from the template's @click handler on part="ch".
     * This runs inside the shadow DOM so ProseMirror won't intercept it.
     */
    public handleControlClick(event: MouseEvent) {
      // Prevent default and stop propagation to avoid interfering with ProseMirror
      event.preventDefault();
      event.stopPropagation();
      
      // Toggle selection
      this.selected = !this.selected;
      
      // Dispatch event for parent to aggregate
      this._dispatchToggleEvent();
    }

    /**
     * Update the :state(--checked) CSS state on this element.
     * Uses --checked to match the CSS selectors in qti-simple-choice styles.
     */
    private _updateCheckedState() {
      if (this.selected) {
        this.internals.states.add('--checked');
      } else {
        this.internals.states.delete('--checked');
      }
    }

    /**
     * Dispatch the toggle event to notify parent of selection change.
     */
    private _dispatchToggleEvent() {
      const detail: QtiCorrectResponseToggleDetail = {
        identifier: this.identifier,
        selected: this.selected,
      };

      this.dispatchEvent(
        new CustomEvent(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, {
          detail,
          bubbles: true,
          composed: true,
        })
      );
    }

    /**
     * Programmatically set the selected state.
     * Used by parent to sync state from correctResponse attribute.
     */
    public setSelected(selected: boolean) {
      this.selected = selected;
    }
  }

  return CorrectResponseClickElement as Constructor<CorrectResponseClickInterface> & T;
};
