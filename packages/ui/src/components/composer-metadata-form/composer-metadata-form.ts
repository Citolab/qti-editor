import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { QtiI18nController } from '@qti-editor/interactions/shared';

@customElement('qti-composer-metadata-form')
export class QtiComposerMetadataForm extends LitElement {
  private readonly i18n = new QtiI18nController(this);

  @property({ type: String })
  title = '';

  @property({ type: String })
  identifier = '';

  @property({ type: Number })
  itemCount = 1;

  @property({ type: Boolean })
  showValidation = true;

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
        <div class="form-control block space-y-1">
          <label>
            <span class="label-text text-xs">${this.i18n.t('composerMetadata.identifier')}</span>
            <input
              type="text"
              class="input input-bordered input-sm w-full"
              .value=${this.identifier}
              @input=${this.#onIdentifierInput}
              placeholder=${this.i18n.t('composerMetadata.identifierPlaceholder')}
            />
          </label>
          ${this.showValidation && this.identifier.trim() === '' ? html`
            <div class="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content">
              <span class="i-lucide-triangle-alert mt-0.5 size-3.5 shrink-0 text-warning"></span>
              <span>${this.itemCount > 1
                ? this.i18n.t('composerMetadata.identifierMissingMulti')
                : this.i18n.t('composerMetadata.identifierMissing')}</span>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer-metadata-form': QtiComposerMetadataForm;
  }
}
