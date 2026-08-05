import { ContextConsumer } from '@lit/context';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { correctionContext } from '../../context/correction-context.js';
import styles from './qti-gap-text.styles.js';
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
  static override styles: CSSResultGroup = styles;

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
