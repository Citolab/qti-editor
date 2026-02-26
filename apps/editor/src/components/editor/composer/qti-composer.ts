/**
 * QTI Composer - UI Component
 *
 * Local copy from registry - customize as needed.
 * Core functionality comes from @qti-editor/core.
 */

import { consume } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { buildAssessmentItemXml, formatXml, type ComposerItemContext } from '@qti-editor/core/composer';
import { itemContext, type ItemContext } from '@qti-editor/core/item-context';

@customElement('qti-composer')
export class QtiComposer extends LitElement {
  @consume({ context: itemContext, subscribe: true })
  @state()
  public itemContext?: ItemContext;

  #xmlUrl = '';
  #formattedXml = '';

  override createRenderRoot() {
    return this;
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has('itemContext')) {
      const xml = buildAssessmentItemXml(this.itemContext as ComposerItemContext);
      this.#setXmlUrl(xml);
      this.#formattedXml = formatXml(xml);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#revokeXmlUrl();
  }

  #setXmlUrl(xml: string) {
    this.#revokeXmlUrl();
    if (!xml.trim()) {
      this.#xmlUrl = '';
      return;
    }
    const xmlWithDeclaration = xml.startsWith('<?xml')
      ? xml
      : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    const xmlFile = new File([xmlWithDeclaration], 'assessment-item.xml', {
      type: 'application/xml',
    });
    this.#xmlUrl = URL.createObjectURL(xmlFile);
  }

  #revokeXmlUrl() {
    if (!this.#xmlUrl) return;
    URL.revokeObjectURL(this.#xmlUrl);
    this.#xmlUrl = '';
  }

  override render() {
    return html`
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <h3 class="text-sm font-semibold">Composer XML</h3>
        ${this.#xmlUrl
          ? html`
              <a
                class="inline-block text-xs link link-primary"
                href=${this.#xmlUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open XML in new tab
              </a>
              <pre class="m-0 max-h-80 overflow-auto rounded-lg border border-base-300/40 bg-base-200 p-3 text-xs text-base-content">${this.#formattedXml}</pre>
            `
          : html`<p class="text-xs text-base-content/70">No XML available.</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer': QtiComposer;
  }
}
