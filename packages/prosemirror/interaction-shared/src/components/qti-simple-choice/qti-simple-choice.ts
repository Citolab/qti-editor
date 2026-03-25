import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { QtiSimpleChoice } from '@qti-components/interactions-core';

import { CorrectResponseClickMixin } from '../../mixins/correct-response-click.mixin.js';

import type { CSSResult, CSSResultGroup } from 'lit';

const styles = QtiSimpleChoice.styles as CSSResult;

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
 */
export class QtiSimpleChoiceEdit extends CorrectResponseClickMixin(QtiSimpleChoiceBase) {
  // make sure we can text select and click the choices
  static override styles: CSSResultGroup = [
    styles,
    css`
      :host {
        user-select: unset !important;
        cursor: unset !important;
      }
      /* Style the control as clickable */
      [part="ch"] {
        cursor: pointer;
      }
    `
  ];

  // property label
  @property({ type: String, attribute: false })
  marker = '';

  override render() {
    return html`<div part="ch" @click=${this.handleControlClick}>
        <div part="cha"></div>
      </div>
      ${this.marker ? html`<div id="label">${this.marker}</div>` : nothing}
      <slot part="slot"></slot>`;
  }
}
if (!customElements.get('qti-simple-choice')) {
  customElements.define('qti-simple-choice', QtiSimpleChoiceEdit);
}
