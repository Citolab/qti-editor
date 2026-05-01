import { css, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';

import styles from '@qti-components/extended-text-interaction/styles';


export class QtiExtendedTextInteractionEdit extends Interaction {
  static override get styles() {
    return [
      styles,
      css`
        :host {
          display: block;
        }

        /* QTI height classes for expectedLines support */
        :host(.qti-height-lines-3) [part="textarea"] {
          min-height: calc(3 * 1.5em + 1rem);
        }
        :host(.qti-height-lines-6) [part="textarea"] {
          min-height: calc(6 * 1.5em + 1rem);
        }
        :host(.qti-height-lines-15) [part="textarea"] {
          min-height: calc(15 * 1.5em + 1rem);
        }

        /* Lighten placeholder text */
        [part="textarea"] {
          color: hsl(var(--muted-foreground, 220 9% 56%));
          font-style: italic;
        }

        /* Collapsible rubric block styling */
        .rubric-details {
          margin-top: 0.5rem;
        }

        .rubric-summary {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.5rem;
          background-color: hsl(142 76% 94%);
          border: 1px solid hsl(142 76% 80%);
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(142 76% 30%);
          list-style: none;
          user-select: none;
        }

        .rubric-summary::-webkit-details-marker {
          display: none;
        }

        .rubric-summary::before {
          content: '▶';
          font-size: 0.625rem;
          transition: transform 0.15s ease;
        }

        .rubric-details[open] .rubric-summary::before {
          transform: rotate(90deg);
        }

        .rubric-details[open] .rubric-summary {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          border-bottom: none;
        }

        .rubric-content {
          padding: 0.5rem 0.75rem;
          background-color: hsl(142 76% 94%);
          border: 1px solid hsl(142 76% 80%);
          border-top: none;
          border-bottom-left-radius: 0.25rem;
          border-bottom-right-radius: 0.25rem;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: inherit;
          font-size: 0.875rem;
          font-style: normal;
          color: hsl(142 76% 25%);
        }
      `
    ];
  }


  @property({ type: Number, attribute: 'expected-length' })
  expectedLength: number | null = null;

  @property({ type: Number, attribute: 'expected-lines' })
  expectedLines: number | null = null;

  @property({ type: String, attribute: 'placeholder-text' })
  placeholderText: string | null = null;

  @property({ type: String })
  format: 'plain' | 'preformatted' | 'xhtml' = 'plain';

  @property({ type: String, attribute: 'pattern-mask' })
  patternMask: string | null = null;

  @property({ type: Number })
  base: number = 10;

  @property({ type: String, attribute: 'string-identifier' })
  stringIdentifier: string | null = null;

  @property({ type: Number, attribute: 'max-strings' })
  maxStrings: number | null = null;

  @property({ type: Number, attribute: 'min-strings' })
  minStrings: number = 0;

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

  @property({ type: String, attribute: 'correct-response' })
  correctResponse: string | null = null;

  private _getPlaceholderText(): string {
    if (this.placeholderText) {
      return this.placeholderText;
    }
    return 'Candidate enters extended text response here...';
  }

  override render() {
    return html`<slot name="prompt"></slot><div part="textarea">${this._getPlaceholderText()}</div>${this.correctResponse
        ? html`<details class="rubric-details"><summary class="rubric-summary">Rubric / Model answer</summary><div class="rubric-content">${this.correctResponse}</div></details>`
        : nothing}`;
  }
}
if (!customElements.get('qti-extended-text-interaction')) {
  customElements.define('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
}
