/**
 * QTI Composer - UI Component
 *
 * Source: registry/prosekit-ui/composer-panel
 * Status: synced
 * Core functionality comes from @qti-editor/qti-core.
 */

import { consume } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { buildAssessmentItemXml, formatXml, type ComposerItemContext } from '@qti-editor/qti-core/composer';
import { itemContext, type ItemContext } from '@qti-editor/qti-editor-kit/item-context';

@customElement('qti-composer')
export class QtiComposer extends LitElement {
  @consume({ context: itemContext, subscribe: true })
  @state()
  public itemContext?: ItemContext;

  @state()
  private liveComposeEnabled = false;

  #xmlUrl = '';
  #xml = '';
  #formattedXml = '';
  #copyStatus: 'idle' | 'success' | 'error' = 'idle';
  #copyStatusTimer: number | null = null;

  override createRenderRoot() {
    return this;
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has('liveComposeEnabled') && !this.liveComposeEnabled) {
      this.#clearXmlState();
      return;
    }

    if (!this.liveComposeEnabled) {
      return;
    }

    if (changedProperties.has('itemContext') || changedProperties.has('liveComposeEnabled')) {
      this.#composeXml();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#revokeXmlUrl();
    if (this.#copyStatusTimer != null) {
      window.clearTimeout(this.#copyStatusTimer);
      this.#copyStatusTimer = null;
    }
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

  #clearXmlState() {
    this.#revokeXmlUrl();
    this.#xml = '';
    this.#formattedXml = '';
  }

  #composeXml() {
    if (!this.itemContext) {
      this.#clearXmlState();
      return;
    }

    const xml = buildAssessmentItemXml(this.itemContext as ComposerItemContext);
    this.#xml = xml;
    this.#setXmlUrl(xml);
    this.#formattedXml = formatXml(xml);
  }

  async #copyXmlToClipboard() {
    if (!this.#formattedXml.trim()) return;

    try {
      await navigator.clipboard.writeText(this.#formattedXml);
      this.#setCopyStatus('success');
    } catch {
      this.#setCopyStatus('error');
    }
  }

  #buildQtiPreviewUrl(xml: string): string {
    const bytes = new TextEncoder().encode(xml);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    const base64 = window.btoa(binary);
    return `https://qti.citolab.nl/preview?sharedQti=${encodeURIComponent(base64)}`;
  }

  #openInQtiPreview() {
    const xml = this.#xml.trim();
    if (!xml) return;
    const previewUrl = this.#buildQtiPreviewUrl(xml);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }

  #setCopyStatus(status: 'idle' | 'success' | 'error') {
    this.#copyStatus = status;
    if (this.#copyStatusTimer != null) {
      window.clearTimeout(this.#copyStatusTimer);
    }
    if (status !== 'idle') {
      this.#copyStatusTimer = window.setTimeout(() => {
        this.#copyStatus = 'idle';
        this.#copyStatusTimer = null;
        this.requestUpdate();
      }, 1500);
    }
  }

  #onLiveComposeToggle(event: Event) {
    this.liveComposeEnabled = (event.target as HTMLInputElement).checked;
  }

  override render() {
    return html`
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold">Composer XML</h3>
          <label class="flex items-center gap-2 text-xs">
            <span class="font-medium">Live XML compose</span>
            <input
              class="toggle toggle-sm toggle-primary"
              type="checkbox"
              .checked=${this.liveComposeEnabled}
              @change=${this.#onLiveComposeToggle}
            />
          </label>
        </div>
        ${!this.liveComposeEnabled
          ? html`<p class="text-xs text-base-content/70">Live XML composing is off.</p>`
          : this.#xmlUrl
          ? html`
              <div class="flex items-center gap-3">
                <a
                  class="inline-block text-xs link link-primary"
                  href=${this.#xmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open XML in new tab
                </a>
                <button class="btn btn-xs" type="button" @click=${this.#openInQtiPreview}>
                  Open in qti.citolab.nl
                </button>
                <button class="btn btn-xs" type="button" @click=${this.#copyXmlToClipboard}>Copy</button>
                ${this.#copyStatus === 'success'
                  ? html`<span class="text-xs text-success">Copied</span>`
                  : this.#copyStatus === 'error'
                    ? html`<span class="text-xs text-error">Copy failed</span>`
                    : null}
              </div>
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
