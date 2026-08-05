import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';

import styles from './qti-simple-match-set.styles.js';

/** Event the parent match interaction dispatches to toggle the drop-slot affordance. */
export const MATCH_SELECTING_TARGET_EVENT = 'match-selecting-target';
export type MatchSelectingTargetDetail = { active: boolean };

/**
 * Editor component for qti-simple-match-set elements.
 * Container for qti-simple-associable-choice elements in match interactions.
 *
 * A `qti-match-interaction` holds exactly two of these, and their order is the direction of the
 * association: sources come from the first set, targets from the second. The element carries no
 * attributes of its own — position is what identifies it.
 *
 * @customElement qti-simple-match-set
 */
export class QtiSimpleMatchSetEdit extends LitElement {
  static override styles = styles;

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
