import { ContextConsumer } from '@lit/context';
import { html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

import { correctionContext } from '../../context/correction-context.js';
import { toggleState } from '../../drag-drop-states.js';
import { renderEditChip } from '../../render/chip.js';
import styles from './qti-simple-associable-choice.styles.js';

import type { CSSResultGroup } from 'lit';


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
 *
 * @customElement qti-simple-associable-choice
 * @attr {string} identifier - Required. Identifies this choice within its interaction; it is
 * the value that appears in the interaction's answer key pairs.
 * @attr {number} match-max - Required. Maximum number of associations this choice may take part
 * in. `0` means unlimited — the choice can be paired with every target.
 * @attr {number} match-min - Minimum number of associations this choice must take part in.
 * @attr {boolean} fixed - Whether the delivery engine must leave this choice in place when the
 * enclosing interaction shuffles its choices.
 */
export class QtiSimpleAssociableChoiceEdit extends LitElement {
  static override styles: CSSResultGroup = styles;

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
   * The drags linked into this choice, rendered as previews in the drop slot.
   *
   * Derived from the correction state rather than assigned by the interaction. The parent used to
   * set this on every target on every change, which meant a choice ProseMirror had just created
   * showed nothing until the next sweep, and the labels came from a cache that could be a step
   * behind the DOM.
   */
  @state()
  private fakeDrags: FakeDrag[] = [];

  /** The correction state of whichever interaction this choice sits in. */
  private readonly correction = new ContextConsumer(this, {
    context: correctionContext,
    subscribe: true,
    callback: () => this.syncFromCorrection(),
  });

  /**
   * Take role, contents and filled-ness from the published state.
   *
   * The role matters most. This element is a drag in the first match set and a drop in the second,
   * and it cannot tell which from anything about itself — only the interaction knows how the sets
   * are ordered. It used to be told by a sweep that only ever ADDED the state, on the reasoning
   * that a choice is what it is for life; that holds where the role is the element type, but here
   * an author can move a choice from one set to the other and it would then be marked both. Setting
   * it from the state, and unsetting the other, is what makes that impossible rather than unlikely.
   *
   * `:state(drag)` is what qti-theme keys on for a chip's whole look — the --drag-* contract and
   * the grip drawn by `:state(drag)::part(control)::before`. `:state(droppable)` is the editor-side
   * spelling of the runtime's `[qti-droppable]`, which this element's own styles accept as the same
   * opt-in precisely so a ProseMirror host can use a state where the runtime uses an attribute.
   */
  private syncFromCorrection(): void {
    const correction = this.correction.value;
    if (!correction) return;

    // Roles are true in every mode; painting them is only right where the interaction is showing
    // its links as chips. In tabular mode these same choices are the grid's headings.
    const role = correction.roleOf(this.identifier);
    const chips = correction.presentation === 'chips';
    toggleState(this.internals.states, 'drag', chips && role === 'drag');
    toggleState(this.internals.states, 'droppable', chips && role === 'drop');

    const drags = chips && role === 'drop' ? correction.dragsIn(this.identifier) : [];
    this.fakeDrags = drags.map(identifier => ({
      identifier,
      label: correction.labelOf(identifier) ?? '',
    }));
    toggleState(this.internals.states, 'filled', this.fakeDrags.length > 0);
  }

  private _onRemoveFakeDrag(identifier: string) {
    this.dispatchEvent(
      new CustomEvent<FakeDragRemoveDetail>('dummy-drag-remove', {
        detail: { identifier },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div part="control"></div>
      <slot part="label"></slot>
      <div part="drop">
        ${this.fakeDrags.map(drag => renderEditChip(drag.label, drag.identifier, () => this._onRemoveFakeDrag(drag.identifier)))}
      </div>
    `;
  }
}
