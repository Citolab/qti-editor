import { LitElement, html, css } from 'lit';

import type { Suggestion } from '@citolab/qti-ai-core';
export class QtiAiSuggestions extends LitElement {
  static properties = { suggestions: { attribute: false }, disabled: { type: Boolean }, label: { type: String } };
  suggestions: Suggestion[] = [];
  disabled = false;
  label = 'Suggested next steps';
  static styles = css`
    :host {
      display: block;
      font: inherit;
    }
    div {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    button {
      font: inherit;
      font-size: 0.82em;
      color: inherit;
      background: var(--qti-ai-surface, transparent);
      border: 1px solid var(--qti-ai-border, #ddd);
      border-radius: 999px;
      padding: 0.4rem 0.7rem;
      cursor: pointer;
    }
    button:hover {
      background: var(--qti-ai-hover, #f5f5f5);
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
  `;
  render() {
    return html`<div role="group" aria-label=${this.label}>
      ${this.suggestions
        .slice(0, 4)
        .map(
          s =>
            html`<button
              part="suggestion"
              ?disabled=${this.disabled}
              @click=${() =>
                this.dispatchEvent(new CustomEvent('qti-ai-suggest', { detail: s, bubbles: true, composed: true }))}
            >
              ${s.label}
            </button>`
        )}
    </div>`;
  }
}
