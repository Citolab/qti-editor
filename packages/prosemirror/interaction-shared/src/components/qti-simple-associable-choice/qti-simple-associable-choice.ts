import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Editor component for qti-simple-associable-choice elements.
 * Used in qti-match-interaction and qti-associate-interaction.
 */
export class QtiSimpleAssociableChoiceEdit extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    slot {
      width: 100%;
      display: block;
    }

    slot[name='qti-simple-associable-choice'] {
      width: auto;
    }
  `;

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

  override render() {
    return html`
      <slot part="slot"></slot>
      <slot
        part="dropslot"
        name="qti-simple-associable-choice"
      ></slot>
    `;
  }
}
if (!customElements.get('qti-simple-associable-choice')) {
  customElements.define('qti-simple-associable-choice', QtiSimpleAssociableChoiceEdit);
}
