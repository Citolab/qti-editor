import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class QtiGapEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      min-width: 5rem;
      margin: 0 0.2rem;
      padding: 0.15rem 0.45rem;
      border: 1px dashed var(--qti-border, #94a3b8);
      border-radius: 0.35rem;
      background: var(--qti-bg, #fff);
      color: var(--qti-text-muted, #64748b);
      vertical-align: baseline;
      line-height: 1.4;
    }

    :host([data-pending]) {
      border-color: var(--qti-border-active, #2563eb);
      background: var(--qti-bg-hover, #eff6ff);
    }

    :host([data-filled]) {
      border-style: solid;
      color: var(--qti-text, #0f172a);
      background: var(--qti-bg-active, #e0f2fe);
    }

    .label {
      white-space: nowrap;
    }
  `;

  @property({ type: String })
  identifier: string | null = null;

  @property({ type: Number, attribute: 'match-max' })
  matchMax = 1;

  @property({ type: String, attribute: 'data-assigned-label' })
  assignedLabel: string | null = null;

  override render() {
    return html`<span class="label">${this.assignedLabel ?? '_____'}</span>`;
  }
}

if (!customElements.get('qti-gap')) {
  customElements.define('qti-gap', QtiGapEdit);
}
