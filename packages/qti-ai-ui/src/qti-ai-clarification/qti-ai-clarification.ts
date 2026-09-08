import { LitElement, html, css, nothing } from 'lit';

import type { Clarification } from '@citolab/qti-ai-core';
export class QtiAiClarification extends LitElement {
  static properties = {
    question: { attribute: false },
    disabled: { type: Boolean },
    otherLabel: { type: String },
    skipLabel: { type: String },
    submitLabel: { type: String }
  };
  question?: Clarification;
  disabled = false;
  otherLabel = 'Your answer';
  skipLabel = 'Choose for me';
  submitLabel = 'Continue';
  static styles = css`
    :host {
      display: block;
      font: inherit;
      margin-top: 0.7rem;
    }
    form {
      display: grid;
      gap: 0.5rem;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    legend {
      margin-bottom: 0.5rem;
    }
    button,
    input {
      font: inherit;
      font-size: 0.85em;
      border: 1px solid var(--qti-ai-border, #ddd);
      border-radius: 1rem;
      padding: 0.4rem 0.7rem;
      background: var(--qti-ai-surface, transparent);
      color: inherit;
    }
    button {
      cursor: pointer;
    }
    input {
      min-width: 0;
      flex: 1;
    }
    .other {
      display: flex;
      gap: 0.4rem;
    }
    button:disabled {
      opacity: 0.45;
    }
  `;
  private answer(value: string, skipped = false) {
    if (!this.disabled && this.question)
      this.dispatchEvent(
        new CustomEvent('qti-ai-answer', {
          detail: { questionId: this.question.id, value, skipped },
          bubbles: true,
          composed: true
        })
      );
  }
  render() {
    const q = this.question;
    if (!q) return nothing;
    return html`<form
      @submit=${(e: SubmitEvent) => {
        e.preventDefault();
        const input = this.renderRoot.querySelector('input');
        if (input?.value.trim()) this.answer(input.value.trim());
      }}
    >
      <fieldset ?disabled=${this.disabled}>
        <legend>${q.question}</legend>
        ${q.options.map(v => html`<button type="button" part="option" @click=${() => this.answer(v)}>${v}</button>`)}
      </fieldset>
      ${q.allowOther
        ? html`<div class="other">
            <input
              aria-label=${this.otherLabel}
              placeholder=${this.otherLabel}
              ?disabled=${this.disabled}
              maxlength="2000"
            /><button ?disabled=${this.disabled}>${this.submitLabel}</button>
          </div>`
        : nothing}
      <div>
        <button type="button" ?disabled=${this.disabled} @click=${() => this.answer('', true)}>
          ${this.skipLabel}
        </button>
      </div>
    </form>`;
  }
}
