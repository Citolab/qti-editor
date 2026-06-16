import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

// Reuse the runtime qti-components associable-choice styles so the editor host
// layout matches the live interaction as closely as possible.
import associableChoiceStyles from '@qti-components/interactions-core/elements/qti-simple-associable-choice/styles';

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
  static override styles = [
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
        /* Pulsing border driven by the parent match set via --qti-dropslot-selecting.
           Stays paused (invisible border) in normal state; runs when selecting. */
        animation: dropslot-pulse 1.2s ease-in-out infinite;
        animation-play-state: var(--qti-dropslot-selecting, paused);
      }

      @keyframes dropslot-pulse {
        0%, 100% { border-color: var(--qti-border, #cbd5e1); }
        50%       { border-color: var(--qti-border-active, #3b82f6); }
      }

      [part='dropslot']:empty {
        /* Hidden normally; shown when the parent signals selecting mode. */
        display: var(--qti-dropslot-empty-display, none);
      }

      .fake-drag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border: 1px solid var(--qti-correct, #22c55e);
        border-radius: 4px;
        background: var(--qti-bg-success, #dcfce7);
        font-size: 0.9em;
        line-height: 1.2;
        user-select: none;
        cursor: default;
      }

      .fake-drag-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: inherit;
        font-size: 1.1em;
        line-height: 1;
        cursor: pointer;
        opacity: 0.6;
      }

      .fake-drag-remove:hover {
        opacity: 1;
        background: rgb(0 0 0 / 0.1);
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

  private _onRemoveFakeDrag(identifier: string, e: Event) {
    e.stopPropagation();
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
        ${this.fakeDrags.map(
          drag =>
            html`<span class="fake-drag" data-identifier=${drag.identifier}>
              ${drag.label}
              <button
                type="button"
                class="fake-drag-remove"
                aria-label="Remove"
                @click=${(e: Event) => this._onRemoveFakeDrag(drag.identifier, e)}
              >
                ×
              </button>
            </span>`
        )}
      </div>
    `;
  }
}
