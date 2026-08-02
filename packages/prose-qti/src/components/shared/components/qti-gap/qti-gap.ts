import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { QtiGap } from '@qti-components/interactions-core';

import '../qti-fake-drag/register.js';

import type { CSSResultGroup } from 'lit';

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
    //
    // `exportparts` is what gives the chip its grip. The theme draws it with
    // `qti-gap-match-interaction ::part(drag-control)::before`, and `::part()` reaches exactly ONE
    // shadow level: from the document that selector can see into this element's shadow root, but
    // `drag-control` lives one level deeper still, inside <qti-fake-drag>'s own. Forwarding it here
    // republishes it as a part of <qti-gap>, which is where the theme is looking. Without it the
    // chip painted correctly and had no handle — `renderEditChip` carries the same line for the
    // same reason, and this element renders its chip inline rather than through it, so it needs its
    // own copy. It cannot use renderEditChip: that stops `fake-drag-remove` from propagating, and
    // the interaction listens for it on the host.
    return html`<div part="drop">
      ${this.assignedLabel
        ? html`<qti-fake-drag
            part="drag"
            exportparts="drag-control, chip-label, chip-remove"
            .identifier=${this.identifier ?? ''}
            .label=${this.assignedLabel}
          ></qti-fake-drag>`
        : nothing}
    </div>`;
  }
}
