import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';

import styles from '@qti-components/choice-interaction/styles';
import { VocabularyMixin } from '@qti-components/interactions-core';

export type Orientation = 'horizontal' | 'vertical' | undefined;
const ChoiceInteractionBase = VocabularyMixin(Interaction, 'qti-simple-choice') as typeof Interaction;

export class QtiChoiceInteractionEdit extends ChoiceInteractionBase {
  static override get styles() {
    return [
      styles,
      css`
        :host {
          white-space: nowrap;
        }
      `
    ];
  }

  @property({ type: Number, attribute: 'min-choices' })
  minChoices = 0;

  @property({ type: Number, attribute: 'max-choices' })
  maxChoices = 1;

  @property({ type: String, attribute: 'class' })
  classes: 'qti-orientation-vertical' | 'qti-orientation-horizontal' | undefined;

  protected _internals: ElementInternals;
  #mutationObserver: MutationObserver | null = null;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#updateChoices();
    this.#mutationObserver = new MutationObserver(() => this.#updateChoices());
    this.#mutationObserver.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('maxChoices')) {
      this.#updateChoices();
    }
    if (changedProperties.has('correctResponse')) {
      this.#syncSelectedChoices();
    }
  }

  #syncSelectedChoices() {
    const identifiers = new Set(
      typeof this.correctResponse === 'string' && this.correctResponse
        ? this.correctResponse.split(',')
        : Array.isArray(this.correctResponse)
          ? this.correctResponse
          : [],
    );
    this.querySelectorAll<HTMLElement & { setSelected?: (v: boolean) => void; identifier?: string }>(
      'qti-simple-choice',
    ).forEach(choice => {
      choice.setSelected?.(identifiers.has(choice.identifier ?? ''));
    });
  }

  #updateChoices() {
    this._internals.role = this.maxChoices === 1 ? 'radiogroup' : null;
    const role = this.maxChoices === 1 ? 'radio' : 'checkbox';
    this.querySelectorAll('qti-simple-choice').forEach((choice: any) => {
      choice.internals.role = role;
      choice.internals.states.delete(role === 'radio' ? 'checkbox' : 'radio');
      choice.internals.states.add(role);
    });
  }

  override render() {
    return html`<slot part="prompt" name="prompt"></slot><slot part="slot"></slot>`;
  }
}

if (!customElements.get('qti-choice-interaction')) {
  customElements.define('qti-choice-interaction', QtiChoiceInteractionEdit);
}
