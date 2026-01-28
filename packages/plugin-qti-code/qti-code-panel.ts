import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import type { QtiCodeUpdateDetail } from './index';

type CodeMode = 'html' | 'json';

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
    return html`
      <div class="toolbar">
        <div class="title">Generated Code</div>
        <div class="tabs">
          <button
            class=${this._mode === 'html' ? 'active' : ''}
            @click=${() => (this.mode = 'html')}
          >
            HTML
          </button>
          <button
            class=${this._mode === 'json' ? 'active' : ''}
            @click=${() => (this.mode = 'json')}
          >
            JSON
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const htmlText = this.detail?.html ?? '';
    const jsonText = this.detail?.json
      ? JSON.stringify(this.detail.json, null, 2)
      : '';
    const displayText =
      this._mode === 'html' ? this.formatHtml(htmlText) : jsonText;

    return html`
      <section class="panel ${this.detail ? 'open' : ''}">
        ${this.renderToolbar()}
        <pre class="code">${displayText || 'No content yet.'}</pre>
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      color: #0f172a;
    }

    .panel {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 16px;
      padding: 18px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
      opacity: 0.7;
      transform: translateY(8px);
      transition: opacity 200ms ease, transform 200ms ease;
    }

    .panel.open {
      opacity: 1;
      transform: translateY(0);
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      margin-bottom: 12px;
    }

    .title {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .tabs {
      display: flex;
      gap: 8px;
    }

    .tabs button {
      border: 1px solid rgba(148, 163, 184, 0.4);
      background: #fff;
      color: #0f172a;
      border-radius: 999px;
      padding: 6px 12px;
      font-weight: 600;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 120ms ease, border-color 120ms ease;
    }

    .tabs button.active {
      background: #e0f2fe;
      border-color: #38bdf8;
      color: #075985;
    }

    .code {
      margin: 0;
      padding: 12px;
      border-radius: 12px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.75rem;
      overflow: auto;
      max-width: 100%;
      max-height: 320px;
      white-space: pre;
      word-break: normal;
    }
  `;

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
