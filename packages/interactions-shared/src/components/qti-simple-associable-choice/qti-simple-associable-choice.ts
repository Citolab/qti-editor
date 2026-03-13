import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import styles from '@qti-components/interactions/elements/qti-simple-choice/qti-simple-choice.styles.js';

import type { CSSResultGroup } from 'lit';

/**
 * Editor component for qti-simple-associable-choice elements.
 * Used in qti-match-interaction and qti-associate-interaction.
 */
export class QtiSimpleAssociableChoiceEdit extends LitElement {
  static override styles: CSSResultGroup = [
    styles,
    css`
      :host {
        user-select: unset !important;
        cursor: unset !important;
        display: block;
        padding: 0.5em;
        border: 1px solid #ccc;
        border-radius: 4px;
        margin: 0.25em 0;
      }
    `
  ];

  public internals: ElementInternals;
  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  @property({ type: String })
  public identifier: string = 'A';

  @property({ type: Number, attribute: 'match-max' })
  public matchMax: number = 1;

  @property({ type: Number, attribute: 'match-min' })
  public matchMin: number = 0;

  @property({ type: Boolean })
  public fixed: boolean = false;

  override render() {
    return html`<slot></slot>`;
  }
}
customElements.define('qti-simple-associable-choice', QtiSimpleAssociableChoiceEdit);
