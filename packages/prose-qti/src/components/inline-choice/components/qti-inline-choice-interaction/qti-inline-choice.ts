import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { QtiInlineChoice } from '@qti-components/interactions-core';

import { CorrectResponseClickMixin } from '../../../shared';

import type { CSSResultGroup, CSSResult } from 'lit';

const styles = QtiInlineChoice.styles as CSSResult;

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

/**
 * Edit-mode version of qti-inline-choice — same shape as QtiSimpleChoiceEdit.
 *
 * Upstream's styles come first so the option row keeps the runtime's own box (inline-flex, centred,
 * single-line, clipped); this file only adds what edit mode needs on top: the clickable
 * correct-response control and an editable label. Previously :host was declared from scratch here,
 * which meant every upstream tweak to the option row had to be mirrored by hand.
 *
 * The option being inline-level is why the dropdown's layout hinges on the menu's `white-space`:
 * with `normal` each 100%-wide option wraps onto its own line, with `nowrap` they all pin to one
 * line. See qti-inline-choice-interaction.styles.ts, which resets it on [part=menu].
 *
 * @customElement qti-inline-choice
 * @attr {string} identifier - Required. Identifies this option within its
 * `qti-inline-choice-interaction`; it is the value that appears in the interaction's answer key
 * and in the candidate's response.
 */
export class QtiInlineChoiceEdit extends CorrectResponseClickMixin(QtiInlineChoiceBase) {
  static override styles: CSSResultGroup = [
    styles,
    css`
      /* Upstream has no control to space away from the label. */
      :host {
        gap: 0.25rem;
      }

      [part='control'] {
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

      [part='control-mark'] {
        width: 0.5em;
        height: 0.5em;
        border-radius: 50%;
        background: transparent;
      }

      :host(:state(checked)) [part='control-mark'] {
        background: currentColor;
      }

      [part='label'] {
        flex: 1;
        min-width: 0;
        cursor: text;
      }
    `
  ];

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
      <div part="control" @mousedown=${(e: MouseEvent) => e.preventDefault()} @click=${this.handleControlClick}>
        <div part="control-mark"></div>
      </div>
      <div part="label" @mousedown=${this.handleLabelMousedown}>
        <slot></slot>
      </div>
    `;
  }
}
