import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class QtiGapEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      min-width: 5rem;
      margin: 0 0.2rem !important;
      padding: 0.5rem !important;
      border: 2px dashed #c6cad0 !important;
      border-color: var(--qti-border, #c6cad0) !important;
      border-radius: 0.3rem !important;
      background: var(--qti-bg, #fff) !important;
      color: var(--qti-text-muted, #64748b);
      vertical-align: baseline;
      line-height: 1.4;
      cursor: pointer !important;
      box-sizing: border-box;
    }

    :host([data-pending]) {
      border-color: var(--qti-border-error, #f86d70);
      background: var(--qti-bg-error-subtle, #ffecec);
    }

    :host([data-filled]) {
      border-style: solid;
      border-color: var(--qti-border, #c6cad0);
      color: var(--qti-text, #0f172a);
      background: var(--qti-bg, #fff);
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
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
    return html`<span class="label">${this.assignedLabel ?? ''}</span>`;
  }
}

if (!customElements.get('qti-gap')) {
  customElements.define('qti-gap', QtiGapEdit);
}
