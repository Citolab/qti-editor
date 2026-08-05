import { html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { CorrectResponseClickMixin } from '../../mixins/correct-response-click.mixin.js';
import styles from './qti-simple-choice.styles.js';

import type { CSSResultGroup } from 'lit';

/**
 * Base class with internals for the mixin
 */
class QtiSimpleChoiceBase extends LitElement {
  public internals: ElementInternals;
  
  constructor() {
    super();
    this.internals = this.attachInternals();
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
