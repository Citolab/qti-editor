import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('qti-composer-metadata-form')
export class QtiComposerMetadataForm extends LitElement {
  @property({ type: String })
  public title = '';

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
      }),
    );
  }

  override render() {
    return html`
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <h3 class="text-sm font-semibold">Item Metadata</h3>
        <label class="form-control block">
          <span class="label-text text-xs">Title</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            .value=${this.title}
            @input=${this.#onTitleInput}
            placeholder="Enter title"
          />
        </label>
        <label class="form-control block">
          <span class="label-text text-xs">Identifier</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
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
