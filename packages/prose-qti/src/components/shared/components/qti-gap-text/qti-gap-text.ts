import { ContextConsumer } from '@lit/context';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { QtiGapText } from '@qti-components/interactions-core';

import { correctionContext } from '../../context/correction-context.js';
import { toggleState } from '../../drag-drop-states.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-gap-text — one draggable choice in the pool of a
 * `qti-gap-match-interaction`.
 *
 * @customElement qti-gap-text
 * @attr {string} identifier - Required. Identifies this choice within its interaction; it is
 * the first half of every `gaptext gap` pair in the interaction's answer key.
 * @attr {number} match-max - Maximum number of gaps this choice may be associated with. `0`
 * means unlimited — the choice can be reused in every gap.
 */
export class QtiGapTextEdit extends LitElement {
  /**
   * Upstream's stylesheet, plus the authoring-only additions — the same shape
   * `QtiSimpleChoiceEdit` uses. Imported through the package root, not a deep
   * `elements/qti-gap-text/...` path: the local-link aliases bind whole specifiers, so a deep path
   * silently resolves to the published dist even in source-link mode.
   *
   * Taking upstream's is what keeps a chip and the gap it drops into the same size. `@mixin drag`
   * gives a chip `min-width: var(--qti-dropzone-min-width)` and the gap reserves the same value, so
   * a private copy here could only drift from the box the interaction measured.
   *
   * Per-state visuals (selected / linked / disabled) stay in the host application's stylesheet via
   * `qti-gap-text:state(...)`. Transient UI state is expressed through
   * {@link ElementInternals.states}, never a DOM attribute, so it can't leak into serialized XML.
   */
  static override styles: CSSResultGroup = [
    QtiGapText.styles,
    css`
      /*
       * Upstream sets user-select: none — correct at runtime, where a chip is dragged and never
       * read as text. Here the label IS the text the author types, so it has to come back off.
       * QtiSimpleChoiceEdit carries the identical override for the identical reason.
       */
      :host {
        user-select: unset !important;
        cursor: unset !important;
      }

      /* ProseMirror edits the label in place: its own margins and the trailing break it parks at the
         end of an empty text block are authoring artefacts upstream never sees. */
      ::slotted(*) {
        margin: 0;
      }

      ::slotted(.ProseMirror-trailingBreak) {
        display: inline;
      }
    `
  ];

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  public internals: ElementInternals;

  /**
   * The correction state of whichever interaction this chip sits in.
   *
   * Subscribed rather than pushed: the interaction used to sweep its chips and set these states on
   * each one, which meant a chip ProseMirror had just created stayed unpainted until the next
   * sweep. `context-request` is an event, so a chip that is recreated re-subscribes by connecting
   * and gets the current state without anyone having to notice it arrived.
   */
  private readonly correction = new ContextConsumer(this, {
    context: correctionContext,
    subscribe: true,
    callback: () => this.syncStates(),
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const inInteraction = this.parentElement?.tagName.endsWith('INTERACTION') ?? false;
    if (inInteraction) {
      this.setAttribute('slot', 'drags');
    }
  }

  /**
   * `linked` — this chip is in at least one drop. `disabled` — it is in as many as it may be, and
   * is not the one the author is holding, so there is nowhere left to put it.
   *
   * `selected` is deliberately absent: {@link PendingSelectionController} owns that one, and two
   * writers on one state is how it ends up stuck on.
   */
  private syncStates(): void {
    const state = this.correction.value;
    const identifier = this.identifier;
    if (!state || !identifier) return;

    const used = state.dropsOf(identifier).length;
    const limit = state.limitOf(identifier);

    toggleState(this.internals.states, 'linked', used > 0);
    toggleState(
      this.internals.states,
      'disabled',
      limit !== 0 && used >= limit && state.pending !== identifier,
    );
  }

  override render() {
    return html`<div part="control"></div>
      <slot part="label"></slot>`;
  }
}
