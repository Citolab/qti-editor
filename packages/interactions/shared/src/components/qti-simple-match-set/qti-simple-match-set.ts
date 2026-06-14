import { css, html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';

/** Event the parent match interaction dispatches to toggle the drop-slot affordance. */
export const MATCH_SELECTING_TARGET_EVENT = 'match-selecting-target';
export type MatchSelectingTargetDetail = { active: boolean };

/**
 * Editor component for qti-simple-match-set elements.
 * Container for qti-simple-associable-choice elements in match interactions.
 */
export class QtiSimpleMatchSetEdit extends LitElement {
  static override styles = css`
    /* Wrapper generates no box so it doesn't affect the slotted layout. */
    .slot-wrapper {
      display: contents;
    }

    /*
     * Drop-slot affordance: while the parent match interaction is waiting for a
     * target to be selected, it dispatches MATCH_SELECTING_TARGET_EVENT, which
     * toggles the internal "selecting" class. We keep this state in shadow DOM
     * (never a host attribute) so ProseMirror's mutation observer leaves the
     * element alone. Each slotted choice then reads as a clickable drop slot.
     */
    .slot-wrapper.selecting ::slotted(qti-simple-associable-choice) {
      outline: 1px solid var(--qti-border, #cbd5e1);
      outline-offset: 2px;
      border-radius: 4px;
      cursor: pointer;
    }

    .slot-wrapper.selecting ::slotted(qti-simple-associable-choice:hover) {
      outline-color: var(--qti-border-active, #3b82f6);
    }
  `;

  @state()
  private _selecting = false;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener(MATCH_SELECTING_TARGET_EVENT, this._onSelectingTarget as EventListener);
  }

  override disconnectedCallback() {
    this.removeEventListener(MATCH_SELECTING_TARGET_EVENT, this._onSelectingTarget as EventListener);
    super.disconnectedCallback();
  }

  private _onSelectingTarget = (e: CustomEvent<MatchSelectingTargetDetail>) => {
    this._selecting = e.detail?.active ?? false;
  };

  override render() {
    return html`<div class="slot-wrapper ${this._selecting ? 'selecting' : ''}"><slot></slot></div>`;
  }
}
