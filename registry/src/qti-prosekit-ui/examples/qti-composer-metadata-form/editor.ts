/**
 * QTI Composer Metadata Form Editor Example
 *
 * This file demonstrates how to use the QtiComposerMetadataForm
 * component and handle metadata changes.
 */

import '../../ui/qti-composer-metadata-form/index.js';

import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface MetadataChangeDetail {
  title: string;
  identifier: string;
}

/**
 * Example component showing how to use the metadata form.
 */
@customElement('qti-metadata-form-example')
export class QtiMetadataFormExample extends LitElement {
  @state()
  private itemTitle = 'My Assessment Item';

  @state()
  private identifier = 'item-001';

  override createRenderRoot() {
    return this;
  }

  #onMetadataChange(event: CustomEvent<MetadataChangeDetail>) {
    const { title, identifier } = event.detail;
    this.itemTitle = title;
    this.identifier = identifier;

    // In a real application, you would update your item state here
    console.log('Metadata changed:', { title, identifier });
  }

  override render() {
    return html`
      <div class="metadata-form-wrapper space-y-4">
        <qti-composer-metadata-form
          .title=${this.itemTitle}
          .identifier=${this.identifier}
          @metadata-change=${this.#onMetadataChange}
        ></qti-composer-metadata-form>

        <div class="text-xs text-base-content/70">
          <p>Current title: ${this.itemTitle}</p>
          <p>Current identifier: ${this.identifier}</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-metadata-form-example': QtiMetadataFormExample;
  }
}
