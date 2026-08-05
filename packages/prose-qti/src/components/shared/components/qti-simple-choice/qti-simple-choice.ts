import { ContextConsumer } from '@lit/context';
import { html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { correctionContext } from '../../context/correction-context.js';
import { toggleState } from '../../drag-drop-states.js';
import { CorrectResponseClickMixin } from '../../mixins/correct-response-click.mixin.js';
import styles from './qti-simple-choice.styles.js';

import type { CSSResultGroup } from 'lit';

/**
 * Base class with internals for the mixin
 */
class QtiSimpleChoiceBase extends LitElement {
  public internals: ElementInternals;

  /**
   * The correction state of the interaction this choice sits in, when there is one.
   *
   * Order provides it; the choice interaction does not, and gets `undefined` — so this is inert
   * there rather than needing a flag. What it buys in order is that a placed choice knows it is
   * placed without the interaction sweeping its children to tell them, which is what let the label
   * cache and its observer go.
   *
   * Only `linked`. A placed choice can still be picked up and moved to another slot, so it is never
   * "used up" the way a gap-match chip at its match-max is, and marking it `disabled` would
   * discourage exactly the gesture that is still available.
   */
  private readonly correction = new ContextConsumer(this, {
    context: correctionContext,
    subscribe: true,
    callback: () => this.syncFromCorrection(),
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  private syncFromCorrection(): void {
    const state = this.correction.value;
    const identifier = this.getAttribute('identifier');
    if (!state || !identifier) return;
    toggleState(this.internals.states, 'linked', state.dropsOf(identifier).length > 0);
  }
}

/**
 * qti-order-interaction
 * qti-choice-interaction
 * 
 * Edit mode version of qti-simple-choice that allows:
 * - Text editing in the content slot
 * - Clicking the radio/checkbox control to set correct responses
 *
 * @customElement qti-simple-choice
 * @attr {string} identifier - Required. Identifies this choice within its interaction; it is
 * the value that appears in the interaction's answer key and in the candidate's response. Read
 * straight off the element by the parent interaction, so it is not a reactive property here.
 */
export class QtiSimpleChoiceEdit extends CorrectResponseClickMixin(QtiSimpleChoiceBase) {
  // make sure we can text select and click the choices
  static override styles: CSSResultGroup = styles;

  // property label
  @property({ type: String, attribute: false })
  marker = '';

  override render() {
    return html`<div part="control" @click=${this.handleControlClick}>
        <div part="control-mark"></div>
      </div>
      ${this.marker ? html`<div id="label" part="marker">${this.marker}</div>` : nothing}
      <slot part="label"></slot>`;
  }
}
