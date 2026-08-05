import { ContextConsumer } from '@lit/context';
import { css, html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { QtiGap } from '@qti-components/interactions-core';

import { correctionContext } from '../../context/correction-context.js';
import { toggleState } from '../../drag-drop-states.js';

import '../dummy-drag/register.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-gap — one blank in a `qti-gap-match-interaction` passage that a
 * `qti-gap-text` choice can be dropped into.
 *
 * @customElement qti-gap
 * @attr {string} identifier - Required. Identifies this gap within its interaction; it is the
 * second half of every `gaptext gap` pair in the interaction's answer key.
 * @attr {number} match-max - Maximum number of choices that may be associated with this gap. A
 * gap can only ever hold one, so QTI defines no match-max on it; the editor keeps the attribute
 * for symmetry with the other associable elements.
 * @attr {string} data-assigned-label - Editor-specific, written by the parent interaction: the
 * label text of the choice currently filling this gap, so the gap can render the chip without
 * looking the choice up again.
 */
export class QtiGapEdit extends LitElement {
  /**
   * Upstream's stylesheet, plus the few authoring-only additions — the same shape
   * `QtiSimpleChoiceEdit` uses. It is imported through the package root rather than a deep
   * `elements/qti-gap/qti-gap.styles.js` path on purpose: the local-link aliases bind whole
   * specifiers (`@qti-components/interactions-core`), so a deep path silently resolves to the
   * published dist even in source-link mode.
   *
   * What upstream brings that the editor's private copy did not have:
   * `min-height`/`min-width: var(--qti-dropzone-min-*)` on `[part~='drop']`, which is what makes a
   * gap take the size of the widest chip, and `vertical-align: middle` on the host, without which a
   * gap tall enough to hold a chip rides above its own line of prose.
   *
   * Per-state visuals (pending / filled) stay out of here: the host application owns the affordance
   * via lightdom selectors like `qti-gap:state(pending)` so authoring tools can theme it freely.
   * Transient UI state is expressed via {@link ElementInternals.states}, never a DOM attribute, so
   * it cannot leak into serialized XML.
   */
  static override styles: CSSResultGroup = [
    QtiGap.styles,
    css`
      :host {
        /* An empty gap still has to be a visible, clickable target while authoring. Upstream has no
           equivalent: at runtime a gap is only ever empty before the candidate fills it. */
        min-width: 5rem;
        gap: 4px;
        line-height: 1.4;
      }
    `
  ];

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  /**
   * The chip this gap is painting, reflected so it stays inspectable from outside.
   *
   * Derived from the correction state rather than pushed in by the interaction. When the parent
   * wrote it, the label could lag the state that named it — a gap filled by a chip created in the
   * same transaction painted a raw `GAP_TEXT_<uuid>`, because the parent's label cache had not seen
   * the chip yet. Read from the state at render time there is nothing to be out of date.
   */
  @property({ type: String, attribute: 'data-assigned-label', reflect: true })
  assignedLabel: string | null = null;

  /**
   * Identifier of the drag currently in this gap, or null.
   *
   * Kept apart from {@link assignedLabel} because a chip with no words is still a chip: an author
   * who has emptied one has a gap that is filled and shows nothing, which is the truth. Deciding
   * that from the label alone would make an empty chip indistinguishable from an empty gap.
   */
  @state()
  private occupant: string | null = null;

  public internals: ElementInternals;

  /** The correction state of whichever interaction this gap sits in. */
  private readonly correction = new ContextConsumer(this, {
    context: correctionContext,
    subscribe: true,
    callback: () => this.syncFromCorrection(),
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  /**
   * `filled` — something is in this gap. `pending` — the author is holding a chip and this gap is
   * empty, so it is somewhere that chip could go.
   */
  private syncFromCorrection(): void {
    const state = this.correction.value;
    const identifier = this.identifier;
    if (!state || !identifier) return;

    const occupant = state.dragsIn(identifier)[0] ?? null;
    this.occupant = occupant;
    this.assignedLabel = occupant ? (state.labelOf(occupant) ?? '') : null;

    toggleState(this.internals.states, 'filled', occupant != null);
    toggleState(this.internals.states, 'pending', state.pending != null && occupant == null);
  }

  override render() {
    // Mirror the runtime qti-components contract: a filled <qti-gap> contains
    // a child drag element. Here that's <dummy-drag part="drag"> — the same
    // element used inside drop slots of the other three drag-drop interactions.
    // Empty gaps render nothing so they don't reserve layout for an invisible
    // chip. The × inside <dummy-drag> dispatches `dummy-drag-remove`; we
    // forward to the host interaction's existing onClickFilledGap handler via
    // a plain click (it inspects composedPath() for the gap).
    //
    // `exportparts` is what gives the chip its grip. The theme draws it with
    // `qti-gap-match-interaction ::part(drag-control)::before`, and `::part()` reaches exactly ONE
    // shadow level: from the document that selector can see into this element's shadow root, but
    // `drag-control` lives one level deeper still, inside <dummy-drag>'s own. Forwarding it here
    // republishes it as a part of <qti-gap>, which is where the theme is looking. Without it the
    // chip painted correctly and had no handle — `renderEditChip` carries the same line for the
    // same reason, and this element renders its chip inline rather than through it, so it needs its
    // own copy. It cannot use renderEditChip: that stops `dummy-drag-remove` from propagating, and
    // the interaction listens for it on the host.
    return html`<div part="drop">
      ${this.occupant != null
        ? html`<dummy-drag
            part="drag"
            exportparts="drag-control, chip-label, chip-remove"
            .identifier=${this.identifier ?? ''}
            .label=${this.assignedLabel ?? ''}
          ></dummy-drag>`
        : nothing}
    </div>`;
  }
}
