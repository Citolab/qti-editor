import { consume } from '@lit/context';
import { html, LitElement, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { QtiI18nController } from '@qti-editor/interaction-shared/i18n/index.js';
import { defineDocChangeHandler, defineMountHandler, union, type Editor } from 'prosekit/core';
import { qtiFromNode, countQtiItems, getQtiItems, type QtiItemFragment, type QtiComposeMode } from '@qti-editor/prosekit-integration/save-qti';
import { formatXml } from '@qti-editor/core/composer';
import { itemContext, type ItemContext } from '@qti-editor/prosekit-integration/item-context';

const DEBOUNCE_MS = 300;

@customElement('qti-composer')
export class QtiComposer extends LitElement {
  @consume({ context: itemContext, subscribe: true })
  itemContext: ItemContext = {} as ItemContext;

  private readonly i18n = new QtiI18nController(this);

  #liveComposeEnabled = false;

  get liveComposeEnabled(): boolean {
    return this.#liveComposeEnabled;
  }

  set liveComposeEnabled(value: boolean) {
    const old = this.#liveComposeEnabled;
    if (old === value) return;
    this.#liveComposeEnabled = value;
    this.requestUpdate('liveComposeEnabled', old);
  }

  #composeMode: QtiComposeMode = 'single';
  #selectedItemIndex = 0;
  #itemCount = 1;
  #itemFragments: QtiItemFragment[] = [];

  #xmlUrl = '';
  #xml = '';
  #formattedXml = '';
  #composeError = '';
  #copyStatus: 'idle' | 'success' | 'error' = 'idle';
  #copyStatusTimer: number | null = null;
  #debounceTimer: number | null = null;
  #editor: Editor | null = null;
  #unregisterExtension: VoidFunction | null = null;

  get editor(): Editor | null {
    return this.#editor;
  }

  set editor(value: Editor | null) {
    if (this.#editor === value) return;
    this.#teardownExtension();
    this.#editor = value;
    this.#setupExtension();
  }

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
    this.#teardownExtension();
    this.#cancelDebounce();
    this.#revokeXmlUrl();
    if (this.#copyStatusTimer != null) {
      window.clearTimeout(this.#copyStatusTimer);
      this.#copyStatusTimer = null;
    }
  }

  #setupExtension() {
    if (!this.#editor) return;

    const onDocChange = () => {
      if (this.liveComposeEnabled) {
        this.#debouncedComposeXml();
      }
    };

    if (this.#editor.mounted) {
      this.#unregisterExtension = this.#editor.use(
        defineDocChangeHandler(onDocChange),
      );
    } else {
      this.#unregisterExtension = this.#editor.use(
        union(
          defineMountHandler(() => {
            if (this.liveComposeEnabled) {
              this.#composeXml();
              this.requestUpdate();
            }
          }),
          defineDocChangeHandler(onDocChange),
        ),
      );
    }
  }

  #teardownExtension() {
    this.#unregisterExtension?.();
    this.#unregisterExtension = null;
  }

  #cancelDebounce() {
    if (this.#debounceTimer != null) {
      window.clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
  }

  #debouncedComposeXml() {
    this.#cancelDebounce();
    this.#debounceTimer = window.setTimeout(() => {
      this.#debounceTimer = null;
      this.#composeXml();
      this.requestUpdate();
    }, DEBOUNCE_MS);
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
    this.#composeError = '';
    this.#itemCount = 1;
    this.#itemFragments = [];
    this.#selectedItemIndex = 0;
  }

  #composeXml() {
    if (!this.#editor?.mounted) {
      this.#clearXmlState();
      return;
    }

    const doc = this.#editor.state.doc;
    const context = {
      identifier: this.itemContext?.identifier,
      lang: this.itemContext?.lang,
      title: this.itemContext?.title,
    };

    // Count items and get fragments
    this.#itemCount = countQtiItems(doc);
    this.#itemFragments = getQtiItems(doc, context);

    // Reset selected index if out of bounds
    if (this.#selectedItemIndex >= this.#itemFragments.length) {
      this.#selectedItemIndex = 0;
    }

    // Get XML based on mode
    if (this.#composeMode === 'single') {
      const xml = qtiFromNode(doc, context, 'single');
      this.#xml = xml;
      this.#setXmlUrl(xml);
      this.#formattedXml = formatXml(xml);
    } else {
      // Multiple mode - show selected item
      const selectedFragment = this.#itemFragments[this.#selectedItemIndex];
      if (selectedFragment) {
        this.#xml = selectedFragment.xml;
        this.#setXmlUrl(selectedFragment.xml);
        this.#formattedXml = selectedFragment.formattedXml;
      } else {
        this.#clearXmlState();
      }
    }
  }

  #onModeChange = (mode: QtiComposeMode) => {
    if (this.#composeMode === mode) return;
    this.#composeMode = mode;
    this.#composeXml();
    this.requestUpdate();
  };

  #onItemSelect = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    this.#selectedItemIndex = parseInt(select.value, 10);
    this.#composeXml();
    this.requestUpdate();
  };

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

  #onLiveComposeToggle = (event: Event) => {
    this.liveComposeEnabled = (event.target as HTMLInputElement).checked;
    if (this.liveComposeEnabled) {
      this.#composeXml();
    }
  };

  #renderTabs() {
    const hasDividers = this.#itemCount > 1;
    
    return html`
      <div class="flex gap-1 text-xs border-b border-base-300/40 mb-3">
        <button
          type="button"
          class="px-3 py-1.5 rounded-t ${this.#composeMode === 'single' 
            ? 'bg-base-200 font-semibold border border-b-0 border-base-300/40' 
            : 'hover:bg-base-100'}"
          @click=${() => this.#onModeChange('single')}
        >
          ${this.i18n.t('composer.singleItem')}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-t ${this.#composeMode === 'multiple' 
            ? 'bg-base-200 font-semibold border border-b-0 border-base-300/40' 
            : 'hover:bg-base-100'}"
          @click=${() => this.#onModeChange('multiple')}
        >
          ${this.i18n.t('composer.multipleItems')}${hasDividers ? ` (${this.#itemCount})` : ''}
        </button>
      </div>
    `;
  }

  #renderItemSelector() {
    if (this.#composeMode !== 'multiple' || this.#itemFragments.length <= 1) {
      return nothing;
    }

    return html`
      <div class="flex items-center gap-2 mb-2">
        <label class="text-xs font-medium">${this.i18n.t('composer.selectItem')}:</label>
        <select
          class="select select-xs select-bordered"
          .value=${String(this.#selectedItemIndex)}
          @change=${this.#onItemSelect}
        >
          ${this.#itemFragments.map((fragment, index) => html`
            <option value=${index}>${fragment.title}</option>
          `)}
        </select>
      </div>
    `;
  }

  override render() {
    return html`
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold">${this.i18n.t('composer.heading')}</h3>
          <label class="flex items-center gap-2 text-xs">
            <span class="font-medium">${this.i18n.t('composer.liveCompose')}</span>
            <input
              class="toggle toggle-sm toggle-primary"
              type="checkbox"
              .checked=${this.liveComposeEnabled}
              @change=${this.#onLiveComposeToggle}
            />
          </label>
        </div>
        ${!this.liveComposeEnabled
          ? html`<p class="text-xs text-base-content/70">${this.i18n.t('composer.liveComposeOff')}</p>`
          : this.#composeError
            ? html`<p class="text-xs text-error">Compose failed: ${this.#composeError}</p>`
          : this.#xmlUrl
            ? html`
                ${this.#renderTabs()}
                ${this.#renderItemSelector()}
                <div class="flex items-center gap-3">
                  <a
                    class="inline-block text-xs link link-primary"
                    href=${this.#xmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${this.i18n.t('composer.openXml')}
                  </a>
                  <button class="btn btn-xs" type="button" @click=${this.#openInQtiPreview}>
                    ${this.i18n.t('composer.openPreview')}
                  </button>
                  <button class="btn btn-xs" type="button" @click=${this.#copyXmlToClipboard}>
                    ${this.i18n.t('composer.copy')}
                  </button>
                  ${this.#copyStatus === 'success'
                    ? html`<span class="text-xs text-success">${this.i18n.t('composer.copied')}</span>`
                    : this.#copyStatus === 'error'
                      ? html`<span class="text-xs text-error">${this.i18n.t('composer.copyFailed')}</span>`
                      : null}
                </div>
                <pre class="m-0 max-h-80 overflow-auto rounded-lg border border-base-300/40 bg-base-200 p-3 text-xs text-base-content">${this.#formattedXml}</pre>
              `
            : html`<p class="text-xs text-base-content/70">${this.i18n.t('composer.noXml')}</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer': QtiComposer;
  }
}
