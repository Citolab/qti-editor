import { consume } from '@lit/context';
import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { defineDocChangeHandler, defineMountHandler, union, type Editor } from 'prosekit/core';
import { QtiI18nController } from '@citolab/prose-qti/components/shared';
import { itemContext, type ItemContext } from '@citolab/prose-qti/integration/item-context';

import { getQtiItems, type QtiItemFragment } from '../../../lib/qti-export.js';

const APPLY_DEBOUNCE_MS = 250;
const consumeItemContext = consume({ context: itemContext, subscribe: true }) as any;

/**
 * Renders the live QTI item player for the currently selected item alongside
 * its composed XML, with an item list to switch between items.
 *
 * The player runs in its own document (see preview.html / preview-entry.ts)
 * rather than the editor's, because `@qti-components/item` registers its
 * interactive components under the literal QTI tag names (e.g.
 * `qti-extended-text-interaction`) — the same tag names `@citolab/prose-qti`
 * registers in the editor document for authoring (with `inert` inputs, by
 * design). Custom element registration is global per document, so the real
 * candidate-interactive components need their own document to register in.
 *
 * The iframe (and everything it loads) is only created the first time this
 * panel becomes active, so `@qti-components/item` is never fetched until the
 * user actually opens the Preview tab. XML pushed to the iframe is debounced
 * while active so rapid edits don't thrash it; the first push after
 * activation (or after the iframe signals it's ready) is immediate.
 */
@customElement('qti-preview-panel')
export class QtiPreviewPanel extends LitElement {
  @property({ type: Boolean })
  active = false;

  @property({ attribute: false })
  editor: Editor | null = null;

  @consumeItemContext
  itemContext: ItemContext = {} as ItemContext;

  private readonly i18n = new QtiI18nController(this);

  @state()
  private _iframeStarted = false;

  @state()
  private _iframeReady = false;

  @state()
  private _itemFragments: QtiItemFragment[] = [];

  @state()
  private _selectedIndex = 0;

  @state()
  private _composeError = '';

  @state()
  private _xmlUrl = '';

  @state()
  private _copyStatus: 'idle' | 'success' | 'error' = 'idle';

  @state()
  private _showCorrectResponse = false;

  @state()
  private _score: { score: number | null; maxScore: number | null } | null = null;

  private _formattedXml = '';
  private _copyStatusTimer: ReturnType<typeof setTimeout> | undefined;
  private _debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private _attachedEditor: Editor | null = null;
  private _unregisterExtension: VoidFunction | undefined;
  private readonly _iframeRef = createRef<HTMLIFrameElement>();

  override createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._onMessage);
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage);
    this._teardownExtension();
    if (this._debounceHandle) clearTimeout(this._debounceHandle);
    if (this._copyStatusTimer) clearTimeout(this._copyStatusTimer);
    this._revokeXmlUrl();
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (changed.has('editor')) {
      this._teardownExtension();
      this._setupExtension();
    }
    if (changed.has('itemContext')) {
      this._composeXml();
    }
  }

  override updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has('active') && this.active) {
      this._iframeStarted = true;
      if (this._debounceHandle) {
        clearTimeout(this._debounceHandle);
        this._debounceHandle = undefined;
      }
      // Bypass the debounce on activation — apply whatever XML we already
      // have immediately (once the iframe is ready to receive it).
      this._postXmlIfReady();
    }
    if (changed.has('_selectedIndex') || changed.has('_itemFragments')) {
      this._postXmlIfReady();
    }
  }

  private _onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== this._iframeRef.value?.contentWindow) return;
    const type = (event.data as { type?: unknown })?.type;
    if (type === 'qti-preview:ready') {
      this._iframeReady = true;
      this._postXmlIfReady();
      return;
    }
    if (type === 'qti-preview:score') {
      const data = event.data as { score: number | null; maxScore: number | null };
      this._score = { score: data.score, maxScore: data.maxScore };
    }
  };

  private _postXmlIfReady() {
    if (!this.active || !this._iframeReady) return;
    const xml = this._itemFragments[this._selectedIndex]?.xml;
    if (xml == null) return;
    // A new/changed item invalidates any previously simulated attempt.
    this._score = null;
    this._showCorrectResponse = false;
    this._iframeRef.value?.contentWindow?.postMessage(
      { type: 'qti-preview:xml', xml },
      window.location.origin,
    );
  }

  private get _canSimulateEndAttempt(): boolean {
    return this._itemFragments[this._selectedIndex]?.xml.includes('<qti-response-processing') ?? false;
  }

  private _simulateEndAttempt = () => {
    if (!this._iframeReady) return;
    this._iframeRef.value?.contentWindow?.postMessage(
      { type: 'qti-preview:simulate-end-attempt' },
      window.location.origin,
    );
  };

  private _toggleShowCorrectResponse = () => {
    if (!this._iframeReady) return;
    this._showCorrectResponse = !this._showCorrectResponse;
    this._iframeRef.value?.contentWindow?.postMessage(
      { type: 'qti-preview:show-correct-response', show: this._showCorrectResponse },
      window.location.origin,
    );
  };

  private _setupExtension() {
    this._attachedEditor = this.editor;
    if (!this.editor) return;

    const onDocChange = () => this._debouncedComposeXml();

    if (this.editor.mounted) {
      this._unregisterExtension = this.editor.use(defineDocChangeHandler(onDocChange));
      this._composeXml();
    } else {
      this._unregisterExtension = this.editor.use(
        union(
          defineMountHandler(() => this._composeXml()),
          defineDocChangeHandler(onDocChange),
        ),
      );
    }
  }

  private _teardownExtension() {
    this._unregisterExtension?.();
    this._unregisterExtension = undefined;
    this._attachedEditor = null;
  }

  private _debouncedComposeXml() {
    if (this._debounceHandle) clearTimeout(this._debounceHandle);
    this._debounceHandle = setTimeout(() => {
      this._debounceHandle = undefined;
      this._composeXml();
    }, APPLY_DEBOUNCE_MS);
  }

  private _composeXml() {
    const editor = this._attachedEditor;
    if (!editor?.mounted) {
      this._clearXmlState();
      return;
    }

    const doc = editor.state.doc;
    const context = {
      identifier: this.itemContext?.items?.[0]?.identifier ?? this.itemContext?.identifier,
      lang: this.itemContext?.lang,
      title: this.itemContext?.items?.[0]?.title ?? this.itemContext?.title,
      items: this.itemContext?.items,
    };

    this._itemFragments = getQtiItems(doc, context);
    if (this._selectedIndex >= this._itemFragments.length) {
      this._selectedIndex = 0;
    }

    const selected = this._itemFragments[this._selectedIndex];
    if (selected) {
      this._composeError = '';
      this._formattedXml = selected.formattedXml;
      this._setXmlUrl(selected.xml);
    } else {
      this._clearXmlState();
    }
    this.requestUpdate();
  }

  private _clearXmlState() {
    this._revokeXmlUrl();
    this._formattedXml = '';
    this._composeError = '';
    this._itemFragments = [];
    this._selectedIndex = 0;
  }

  private _setXmlUrl(xml: string) {
    this._revokeXmlUrl();
    if (!xml.trim()) {
      this._xmlUrl = '';
      return;
    }
    const xmlWithDeclaration = xml.startsWith('<?xml')
      ? xml
      : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    const xmlFile = new File([xmlWithDeclaration], 'assessment-item.xml', { type: 'application/xml' });
    this._xmlUrl = URL.createObjectURL(xmlFile);
  }

  private _revokeXmlUrl() {
    if (!this._xmlUrl) return;
    URL.revokeObjectURL(this._xmlUrl);
    this._xmlUrl = '';
  }

  private _selectItem(index: number) {
    if (this._selectedIndex === index) return;
    this._selectedIndex = index;
    const selected = this._itemFragments[index];
    if (selected) {
      this._formattedXml = selected.formattedXml;
      this._setXmlUrl(selected.xml);
    }
  }

  private _buildQtiPreviewUrl(xml: string): string {
    const bytes = new TextEncoder().encode(xml);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    const base64 = window.btoa(binary);
    return `https://qti.citolab.nl/preview?sharedQti=${encodeURIComponent(base64)}`;
  }

  private _openInQtiPreview = () => {
    const xml = this._itemFragments[this._selectedIndex]?.xml?.trim();
    if (!xml) return;
    window.open(this._buildQtiPreviewUrl(xml), '_blank', 'noopener,noreferrer');
  };

  private _copyXmlToClipboard = async () => {
    if (!this._formattedXml.trim()) return;
    try {
      await navigator.clipboard.writeText(this._formattedXml);
      this._setCopyStatus('success');
    } catch {
      this._setCopyStatus('error');
    }
  };

  private _setCopyStatus(status: 'idle' | 'success' | 'error') {
    this._copyStatus = status;
    if (this._copyStatusTimer) clearTimeout(this._copyStatusTimer);
    if (status !== 'idle') {
      this._copyStatusTimer = setTimeout(() => {
        this._copyStatus = 'idle';
        this._copyStatusTimer = undefined;
      }, 1500);
    }
  }

  private _itemLabel(index: number): string {
    return index === 0
      ? this.i18n.t('previewPanel.introLabel')
      : this.i18n.t('previewPanel.questionLabel', { number: index });
  }

  private _renderItemList() {
    const count = this._itemFragments.length;
    return html`
      <div class="w-64 shrink-0 overflow-y-auto border-r border-solid border-gray-200">
        <div class="border-b border-solid border-gray-200 px-4 h-[41px] flex flex-row gap-1 justify-between items-center">
          <h3 class="m-0 text-sm font-semibold text-gray-900">${this.i18n.t('previewPanel.questionsHeading')}</h3>
          <p class="m-0 text-xs text-gray-500">${this.i18n.t('previewPanel.itemCount', { count })}</p>
        </div>
        <ul class="m-0 list-none p-0">
          ${this._itemFragments.map((_, index) => {
            const active = index === this._selectedIndex;
            return html`
              <li>
                <button
                  type="button"
                  class="flex w-full items-center justify-between border-0 border-b border-l-4 border-solid border-gray-200 bg-transparent px-4 py-3 text-left transition-colors last:border-b-0 ${active
                    ? 'border-l-blue-600 bg-blue-50'
                    : 'border-l-transparent hover:bg-gray-100'}"
                  @click=${() => this._selectItem(index)}
                >
                  <span class="text-sm font-medium ${active ? 'text-blue-800' : 'text-gray-900'}">${this._itemLabel(index)}</span>
                  ${active
                    ? html`<svg class="size-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>`
                    : nothing}
                </button>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  private _renderXmlCard() {
    return html`
      <div class="max-h-80 shrink-0 overflow-y-auto border-t border-solid border-gray-200 p-4">
        ${this._composeError
          ? html`<p class="text-xs text-error">${this.i18n.t('previewPanel.composeFailed', { error: this._composeError })}</p>`
          : this._xmlUrl
            ? html`
                <div class="mb-3 flex items-center gap-3">
                  <a
                    class="inline-block text-xs link link-primary"
                    href=${this._xmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >${this.i18n.t('composer.openXml')}</a>
                  <button class="btn btn-xs" type="button" @click=${this._openInQtiPreview}>
                    ${this.i18n.t('composer.openPreview')}
                  </button>
                  <button class="btn btn-xs" type="button" @click=${this._copyXmlToClipboard}>
                    ${this.i18n.t('composer.copy')}
                  </button>
                  ${this._copyStatus === 'success'
                    ? html`<span class="text-xs text-success">${this.i18n.t('composer.copied')}</span>`
                    : this._copyStatus === 'error'
                      ? html`<span class="text-xs text-error">${this.i18n.t('composer.copyFailed')}</span>`
                      : nothing}
                </div>
                <pre class="m-0 overflow-auto rounded-lg border border-base-300/40 bg-base-200 p-3 text-xs text-base-content">${this._formattedXml}</pre>
              `
            : html`<p class="text-xs text-base-content/70">${this.i18n.t('composer.noXml')}</p>`}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="flex h-full w-full">
        ${this._renderItemList()}
        <div class="relative flex min-w-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center justify-end gap-3 border-b border-solid border-gray-200 px-4 py-2">
            ${this._score
              ? html`<span class="text-xs font-medium text-gray-700">${this.i18n.t('previewPanel.score', {
                  score: this._score.score ?? '—',
                  maxScore: this._score.maxScore ?? '—',
                })}</span>`
              : nothing}
            <button
              type="button"
              class="btn btn-xs"
              ?disabled=${!this._iframeReady || !this._canSimulateEndAttempt}
              aria-pressed=${this._showCorrectResponse}
              @click=${this._toggleShowCorrectResponse}
            >${this._showCorrectResponse
              ? this.i18n.t('previewPanel.hideCorrectResponse')
              : this.i18n.t('previewPanel.showCorrectResponse')}</button>
            <button
              type="button"
              class="btn btn-xs"
              ?disabled=${!this._iframeReady || !this._canSimulateEndAttempt}
              @click=${this._simulateEndAttempt}
            >${this.i18n.t('previewPanel.simulateEndAttempt')}</button>
          </div>
          <div class="relative min-h-0 flex-1 px-4">
            ${this._iframeStarted
              ? html`<iframe
                  ${ref(this._iframeRef)}
                  src="/preview.html"
                  title=${this.i18n.t('previewPanel.iframeTitle')}
                  class="h-full w-full border-0"
                ></iframe>`
              : ''}
            ${this._iframeStarted && !this._iframeReady
              ? html`<div class="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-base-content/60">${this.i18n.t('previewPanel.loadingPreview')}</div>`
              : ''}
          </div>
          ${this._renderXmlCard()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-preview-panel': QtiPreviewPanel;
  }
}
