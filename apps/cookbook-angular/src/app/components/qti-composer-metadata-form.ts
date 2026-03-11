/**
 * QTI Composer Metadata Form - UI Component
 *
 * A form for editing item metadata (title, identifier).
 * Customize styling as needed.
 */

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('qti-composer-metadata-form')
export class QtiComposerMetadataForm extends LitElement {
  @property({ type: String })
  override title = '';

  @property({ type: String })
  public identifier = '';

  override createRenderRoot() {
    return this;
  }

  #onTitleInput(event: Event) {
    this.title = (event.target as HTMLInputElement).value;
    this.#emitChange();
  }

  #onIdentifierInput(event: Event) {
    this.identifier = (event.target as HTMLInputElement).value;
    this.#emitChange();
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent('metadata-change', {
        detail: {
          title: this.title,
          identifier: this.identifier,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <section class="space-y-3">
        <label class="block">
          <span class="block text-xs text-base-content/70 mb-1">Title</span>
          <input
            type="text"
            class="input input-sm w-full"
            .value=${this.title}
            @input=${this.#onTitleInput}
            placeholder="Enter title"
          />
        </label>
        <label class="block">
          <span class="block text-xs text-base-content/70 mb-1">Identifier</span>
          <input
            type="text"
            class="input input-sm w-full"
            .value=${this.identifier}
            @input=${this.#onIdentifierInput}
            placeholder="Enter identifier"
          />
        </label>
      </section>
    `;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'qti-composer-metadata-form': QtiComposerMetadataForm;
  }
}
