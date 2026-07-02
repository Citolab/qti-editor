import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { QtiSimpleAssociableChoice } from '@qti-components/interactions-core';

import { renderEditChip } from '../../render/chip.js';

import type { CSSResult, CSSResultGroup } from 'lit';

// Reuse the runtime qti-components associable-choice styles so the editor host
// layout matches the live interaction as closely as possible.
const associableChoiceStyles = QtiSimpleAssociableChoice.styles as CSSResult;

/**
 * A "fake drag": a source associable-choice that has been assigned to this
 * target as part of the correct response. Shown in the drop location to
 * resemble how a student would see a dropped item — without moving any DOM.
 */
export interface FakeDrag {
  identifier: string;
  label: string;
}

/**
 * Emitted when the remove button on a fake drag is clicked. Bubbles and is
 * composed so the parent interaction can clear the association.
 */
export interface FakeDragRemoveDetail {
  identifier: string;
}

/**
 * Editor component for qti-simple-associable-choice elements.
 * Used in qti-match-interaction and qti-associate-interaction.
 */
export class QtiSimpleAssociableChoiceEdit extends LitElement {
  static override styles: CSSResultGroup = [
    associableChoiceStyles,
    css`
      :host {
        flex-direction: column;
        /* Runtime sets user-select:none for dragging; the editor needs to keep
           the choice text selectable/editable. */
        user-select: auto;
        cursor: text !important;
      }

      ::slotted(p) {
        margin: 0;
        width: 100%;
        /* qti-components' runtime styles disable pointer-events on the choice
           content; the editor needs the text clickable so ProseMirror can map
           a click to the correct caret position (otherwise the caret jumps to
           the start of the paragraph). */
        pointer-events: auto !important;
      }

      ::slotted(.ProseMirror-trailingBreak) {
        display: inline;
      }

      [part='dropslot'] {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        width: auto;
      }

      /* Show empty dropslot only when this choice is a pending drop target. */
      [part='dropslot']:empty {
        display: none;
      }

      :host(:state(pending)) [part='dropslot']:empty {
        display: flex;
      }
    `,
  ];

  public internals: ElementInternals;
  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  @property({ type: String })
  identifier: string = 'A';

  @property({ type: Number, attribute: 'match-max' })
  matchMax: number = 1;

  @property({ type: Number, attribute: 'match-min' })
  matchMin: number = 0;

  @property({ type: Boolean })
  fixed: boolean = false;

  /**
   * Source choices assigned to this target as the correct response. Set by the
   * parent interaction; rendered as non-interactive previews in the drop slot.
   */
  @property({ attribute: false })
  fakeDrags: FakeDrag[] = [];

  private _onRemoveFakeDrag(identifier: string) {
    this.dispatchEvent(
      new CustomEvent<FakeDragRemoveDetail>('fake-drag-remove', {
        detail: { identifier },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <slot part="slot"></slot>
      <div part="dropslot">
        ${this.fakeDrags.map(drag => renderEditChip(drag.label, drag.identifier, () => this._onRemoveFakeDrag(drag.identifier)))}
      </div>
    `;
  }
}
