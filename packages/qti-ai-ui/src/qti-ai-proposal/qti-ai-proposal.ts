import { LitElement, html, css } from 'lit';
export class QtiAiProposal extends LitElement {
  static properties = {
    summary: { type: String },
    changes: { attribute: false },
    disabled: { type: Boolean },
    acceptLabel: { type: String },
    rejectLabel: { type: String },
    detailsLabel: { type: String }
  };
  summary = '';
  changes: string[] = [];
  disabled = false;
  acceptLabel = 'Apply';
  rejectLabel = 'Dismiss';
  detailsLabel = 'Review changes';
  static styles = css`
    :host {
      display: block;
      font: inherit;
      margin-top: 0.7rem;
    }
    section {
      border-left: 2px solid var(--qti-ai-accent, #777);
      padding: 0.2rem 0.8rem;
    }
    p {
      margin: 0 0 0.5rem;
    }
    button {
      font: inherit;
      font-size: 0.85em;
      padding: 0.3rem 0.8rem;
      border-radius: 1rem;
      border: 1px solid var(--qti-ai-border, #ddd);
      background: var(--qti-ai-surface, transparent);
      color: inherit;
      cursor: pointer;
      margin-right: 0.4rem;
    }
    details {
      font-size: 0.8em;
      margin: 0.5rem 0;
    }
    li {
      overflow-wrap: anywhere;
    }
    button:disabled {
      opacity: 0.45;
    }
  `;
  render() {
    return html`<section part="proposal">
      <p>${this.summary}</p>
      <details>
        <summary>${this.detailsLabel}</summary>
        <ul>
          ${this.changes.map(c => html`<li>${c}</li>`)}
        </ul>
      </details>
      <button
        ?disabled=${this.disabled}
        @click=${() => this.dispatchEvent(new CustomEvent('qti-ai-accept', { bubbles: true, composed: true }))}
      >
        ${this.acceptLabel}</button
      ><button
        ?disabled=${this.disabled}
        @click=${() => this.dispatchEvent(new CustomEvent('qti-ai-reject', { bubbles: true, composed: true }))}
      >
        ${this.rejectLabel}
      </button>
    </section>`;
  }
}
