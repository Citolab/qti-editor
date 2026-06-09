import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { CorrectResponseClickMixin } from '@qti-editor/interaction-shared';

import type { CSSResultGroup } from 'lit';

class QtiInlineChoiceBase extends LitElement {
  public internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }
}

export const QTI_INLINE_CHOICE_FOCUS_EVENT = 'qti-inline-choice-focus';

export interface QtiInlineChoiceFocusDetail {
  identifier: string;
}

export class QtiInlineChoice extends CorrectResponseClickMixin(QtiInlineChoiceBase) {
  static override styles: CSSResultGroup = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    [part='ch'] {
      cursor: pointer;
      flex-shrink: 0;
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
    [part='label'] {
      flex: 1;
      min-width: 0;
      cursor: text;
    }
  `;

  @property({ type: String })
  override identifier = 'A';

  protected handleLabelMousedown(event: MouseEvent) {
    // Prevent ProseMirror's default posAtCoords cursor placement (it checks
    // event.defaultPrevented before handling mousedown). The plugin will set
    // the cursor precisely at the end of this choice's text content instead.
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent<QtiInlineChoiceFocusDetail>(QTI_INLINE_CHOICE_FOCUS_EVENT, {
        detail: { identifier: this.identifier },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <div part="ch" @mousedown=${(e: MouseEvent) => e.preventDefault()} @click=${this.handleControlClick}>
        <div part="cha"></div>
      </div>
      <div part="label" @mousedown=${this.handleLabelMousedown}>
        <slot part="slot"></slot>
      </div>
    `;
  }
}
