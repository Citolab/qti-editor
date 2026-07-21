import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import '../qti-fake-drag/register.js';

export class QtiGapEdit extends LitElement {
  /**
   * Minimal shadow-DOM styles — just layout for the slot box. Per-state visuals
   * (pending / filled) are NOT defined here: the host application owns the
   * affordance via lightdom selectors like `qti-gap:state(pending)` so authoring
   * tools can theme it freely. Transient UI state is expressed via
   * {@link ElementInternals.states}, not via DOM attributes — that makes it
   * structurally impossible for editor-only state to leak into serialized XML.
   */
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-width: 5rem;
      vertical-align: baseline;
      line-height: 1.4;
      box-sizing: border-box;
    }
  `;

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  @property({ type: String, attribute: 'data-assigned-label' })
  assignedLabel: string | null = null;

  public internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  override render() {
    // Mirror the runtime qti-components contract: a filled <qti-gap> contains
    // a child drag element. Here that's <qti-fake-drag part="drag"> — the same
    // element used inside drop slots of the other three drag-drop interactions.
    // Empty gaps render nothing so they don't reserve layout for an invisible
    // chip. The × inside <qti-fake-drag> dispatches `fake-drag-remove`; we
    // forward to the host interaction's existing onClickFilledGap handler via
    // a plain click (it inspects composedPath() for the gap).
    return html`<div part="drop">
      ${this.assignedLabel
        ? html`<qti-fake-drag
            part="drag"
            .identifier=${this.identifier ?? ''}
            .label=${this.assignedLabel}
          ></qti-fake-drag>`
        : nothing}
    </div>`;
  }
}
