import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { CorrectResponseClickMixin } from '@qti-editor/interaction-shared';

import type { CSSResultGroup } from 'lit';

/**
 * Base class with internals for the mixin
 */
class QtiInlineChoiceBase extends LitElement {
  public internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }
}

/**
 * Edit mode version of qti-inline-choice that allows:
 * - Clicking the radio control to set correct responses
 */
export class QtiInlineChoice extends CorrectResponseClickMixin(QtiInlineChoiceBase) {
  static override styles: CSSResultGroup = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    [part='ch'] {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      border: 1px solid currentColor;
      border-radius: 50%;
      box-sizing: border-box;
    }
    [part='cha'] {
      width: 0.5em;
      height: 0.5em;
      border-radius: 50%;
      background: transparent;
    }
    :host(:state(--checked)) [part='cha'] {
      background: currentColor;
    }
  `;

  @property({ type: String })
  override identifier = 'A';

  override handleControlClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const nextCorrectResponse = this.selected ? null : this.identifier;
    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        detail: {
          nodeType: 'qtiInlineChoiceInteraction',
          tagName: 'qti-inline-choice-interaction',
          attrs: { correctResponse: nextCorrectResponse },
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`<div part="ch" @click=${this.handleControlClick}>
        <div part="cha"></div>
      </div>
      <slot part="slot"></slot>`;
  }
}

if (!customElements.get('qti-inline-choice')) {
  customElements.define('qti-inline-choice', QtiInlineChoice);
}
