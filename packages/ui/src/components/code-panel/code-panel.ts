import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { union, type Extension } from 'prosekit/core';
import {
  qtiCodePanelExtension,
  type QtiCodePanelOptions,
  type QtiCodeUpdateDetail,
  type QtiDocumentJson,
  type QtiNodeJson,
} from '@qti-editor/prosekit-integration/code';

export interface CodePanelExtensionOptions extends QtiCodePanelOptions {}

type CodeMode = 'html' | 'json' | 'xml';

@customElement('qti-code-panel')
export class QtiCodePanel extends LitElement {
  private _eventName = 'qti:code:update';
  private _eventTarget: EventTarget | null = null;
  private _mode: CodeMode = 'html';
  private currentEventTarget: EventTarget | null = null;
  private detail: QtiCodeUpdateDetail | null = null;

  get eventName() {
    return this._eventName;
  }

  set eventName(value: string) {
    const next = value || 'qti:code:update';
    if (this._eventName === next) return;
    const prev = this._eventName;
    this._eventName = next;
    this.updateEventListener(prev, this._eventName, this._eventTarget);
  }

  get eventTarget() {
    return this._eventTarget;
  }

  set eventTarget(value: EventTarget | null) {
    if (this._eventTarget === value) return;
    this._eventTarget = value;
    this.updateEventListener(this._eventName, this._eventName, this._eventTarget);
  }

  get mode() {
    return this._mode;
  }

  set mode(value: CodeMode) {
    if (this._mode === value) return;
    this._mode = value;
    this.requestUpdate();
  }

  private readonly onUpdateEvent = (event: Event) => {
    this.detail = (event as CustomEvent<QtiCodeUpdateDetail>).detail ?? null;
    this.requestUpdate();
  };

  override createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
  }

  disconnectedCallback() {
    if (this.currentEventTarget) {
      this.currentEventTarget.removeEventListener(
        this.eventName,
        this.onUpdateEvent as EventListener,
      );
    }
    super.disconnectedCallback();
  }

  private updateEventListener(
    prevEventName: string,
    nextEventName: string,
    nextTarget: EventTarget | null,
  ) {
    if (!this.isConnected) return;
    const target = nextTarget ?? document;
    const prevTarget = this.currentEventTarget ?? target;
    prevTarget.removeEventListener(prevEventName, this.onUpdateEvent as EventListener);
    target.addEventListener(nextEventName, this.onUpdateEvent as EventListener);
    this.currentEventTarget = target;
  }

  private getEventTarget(): EventTarget {
    return this._eventTarget ?? document;
  }

  private renderToolbar(): TemplateResult {
    return html`
      <div class="mb-3 flex w-full items-center justify-between gap-3 border-b border-base-300/50 pb-3">
        <div class="text-[0.95rem] font-bold">Generated Code</div>
        <div class="join">
          <button
            class=${this._mode === 'html'
              ? 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-primary'
              : 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-ghost'}
            @click=${() => (this.mode = 'html')}
          >
            HTML
          </button>
          <button
            class=${this._mode === 'json'
              ? 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-primary'
              : 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-ghost'}
            @click=${() => (this.mode = 'json')}
          >
            JSON
          </button>
          <button
            class=${this._mode === 'xml'
              ? 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-primary'
              : 'btn btn-xs sm:btn-sm join-item normal-case font-semibold btn-ghost'}
            @click=${() => (this.mode = 'xml')}
          >
            XML
          </button>
        </div>
      </div>
    `;
  }

  override render() {
    const htmlText = this.detail?.html ?? '';
    const jsonText = this.detail?.json ? JSON.stringify(this.detail.json, null, 2) : '';
    const xmlText = this.detail?.xml ?? '';
    const displayText =
      this._mode === 'html'
        ? this.formatHtml(htmlText)
        : this._mode === 'json'
          ? jsonText
          : xmlText;

    return html`
      <section
        class="card border border-base-300/50 bg-base-100 p-4 transition-all ${this.detail
          ? 'opacity-100 translate-y-0'
          : 'opacity-70 translate-y-2'}"
      >
        ${this.renderToolbar()}
        <pre class="m-0 max-h-80 max-w-full overflow-auto rounded-lg border border-base-300/40 bg-base-200 p-3 text-xs text-base-content whitespace-pre break-normal">${displayText || 'No content yet.'}</pre>
      </section>
    `;
  }

  private formatHtml(html: string): string {
    let formatted = '';
    let indent = 0;
    const indentStr = '  ';
    const parts = html.split(/(<[^>]+>)/g).filter(part => part.trim());

    for (const part of parts) {
      if (part.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += indentStr.repeat(indent) + part + '\n';
      } else if (part.startsWith('<') && !part.endsWith('/>')) {
        formatted += indentStr.repeat(indent) + part + '\n';
        indent++;
      } else if (part.startsWith('<') && part.endsWith('/>')) {
        formatted += indentStr.repeat(indent) + part + '\n';
      } else {
        formatted += indentStr.repeat(indent) + part.trim() + '\n';
      }
    }

    return formatted.trim();
  }
}

export function defineExtension(options: CodePanelExtensionOptions = {}): Extension {
  return union(
    qtiCodePanelExtension({
      eventName: options.eventName ?? 'qti:code:update',
      eventTarget: options.eventTarget ?? document,
      emitOnInit: options.emitOnInit ?? true,
    }),
  );
}

export { qtiCodePanelExtension };

export type {
  QtiCodePanelOptions,
  QtiCodeUpdateDetail,
  QtiDocumentJson,
  QtiNodeJson,
};

declare global {
  interface HTMLElementTagNameMap {
    'qti-code-panel': QtiCodePanel;
  }
}
