import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { QtiI18nController } from '@qti-editor/interaction-shared/i18n/index.js';

@customElement('qti-composer-metadata-form')
export class QtiComposerMetadataForm extends LitElement {
  private readonly i18n = new QtiI18nController(this);

  @property({ type: String })
  title = '';

  @property({ type: String })
  identifier = '';

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
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <h3 class="text-sm font-semibold">${this.i18n.t('composerMetadata.heading')}</h3>
        <label class="form-control block">
          <span class="label-text text-xs">${this.i18n.t('composerMetadata.title')}</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            .value=${this.title}
            @input=${this.#onTitleInput}
            placeholder=${this.i18n.t('composerMetadata.titlePlaceholder')}
          />
        </label>
        <label class="form-control block">
          <span class="label-text text-xs">${this.i18n.t('composerMetadata.identifier')}</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            .value=${this.identifier}
            @input=${this.#onIdentifierInput}
            placeholder=${this.i18n.t('composerMetadata.identifierPlaceholder')}
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
