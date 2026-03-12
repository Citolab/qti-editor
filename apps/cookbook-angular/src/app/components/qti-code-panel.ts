/**
 * QTI Code Panel - UI Component
 *
 * Displays editor document as HTML, JSON, or XML.
 * Listens to code update events from the qtiCodePanelExtension.
 * Customize styling as needed.
 */

import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import type { QtiCodeUpdateDetail } from '@qti-editor/core/code';

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

  override connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
  }

  override disconnectedCallback() {
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
    if (prevTarget) {
      prevTarget.removeEventListener(prevEventName, this.onUpdateEvent as EventListener);
    }
    target.addEventListener(nextEventName, this.onUpdateEvent as EventListener);
    this.currentEventTarget = target;
  }

  private getEventTarget(): EventTarget {
    return this._eventTarget ?? document;
  }

  private renderToolbar(): TemplateResult {
    const btnActive = 'btn btn-xs join-item btn-primary';
    const btnInactive = 'btn btn-xs join-item btn-ghost border border-base-300';
    return html`
      <div class="flex w-full items-center justify-between gap-3 border-b border-base-300 pb-3 mb-3">
        <span class="text-sm font-semibold">Generated Code</span>
        <div class="join">
          <button class=${this._mode === 'html' ? btnActive : btnInactive} @click=${() => (this.mode = 'html')}>HTML</button>
          <button class=${this._mode === 'json' ? btnActive : btnInactive} @click=${() => (this.mode = 'json')}>JSON</button>
          <button class=${this._mode === 'xml'  ? btnActive : btnInactive} @click=${() => (this.mode = 'xml')}>XML</button>
        </div>
      </div>
    `;
  }

  override render() {
    const htmlText = this.detail?.html ?? '';
    const jsonText = this.detail?.json ? JSON.stringify(this.detail.json, null, 2) : '';
    const xmlText  = this.detail?.xml ?? '';
    const displayText = this._mode === 'html' ? this.formatHtml(htmlText)
      : this._mode === 'json' ? jsonText : xmlText;

    return html`
      <section class="card bg-base-100 border border-base-300 p-4">
        ${this.renderToolbar()}
        <pre class="m-0 max-h-80 max-w-full overflow-auto rounded-lg bg-base-200 border border-base-300 p-3 text-xs text-base-content whitespace-pre break-normal">${displayText || 'No content yet.'}</pre>
      </section>
    `;
  }

  private formatHtml(html: string): string {
    let formatted = '';
    let indent = 0;
    const indentStr = '  ';
    const parts = html.split(/(<[^>]+>)/g).filter((part) => part.trim());

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

declare global {
  interface HTMLElementTagNameMap {
    'qti-code-panel': QtiCodePanel;
  }
}
