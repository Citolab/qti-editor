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
    // For a choice that already has text, let ProseMirror handle the mousedown
    // natively so the user can click to position the caret and drag to select.
    // Only an *empty* choice needs help: an empty inline element has no DOM text
    // node, so ProseMirror's posAtCoords can't land a cursor inside it. In that
    // case suppress PM's default placement (it bails when defaultPrevented) and
    // ask the plugin to place the caret precisely instead.
    if ((this.textContent ?? '').trim().length > 0) return;

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
