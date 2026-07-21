import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class QtiGapTextEdit extends LitElement {
  /**
   * Minimal shadow-DOM styles — layout only. Per-state visuals (selected /
   * linked / disabled) live in the host application's stylesheet via
   * `qti-gap-text:state(selected|linked|disabled)`. Transient UI state is
   * expressed through {@link ElementInternals.states} — never on a DOM
   * attribute — so it can't leak into serialized XML.
   */
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      min-width: fit-content;
      box-sizing: border-box;
    }

    ::slotted(*) {
      margin: 0;
    }

    ::slotted(.ProseMirror-trailingBreak) {
      display: inline;
    }
  `;

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  public internals: ElementInternals;

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

  override render() {
    return html`<div part="control"></div>
      <slot part="label"></slot>`;
  }
}
