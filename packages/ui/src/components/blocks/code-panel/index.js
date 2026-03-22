var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { union } from 'prosekit/core';
import { qtiCodePanelExtension, } from '@qti-editor/qti-editor-kit/code';
let QtiCodePanel = class QtiCodePanel extends LitElement {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "_eventName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'qti:code:update'
        });
        Object.defineProperty(this, "_eventTarget", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'html'
        });
        Object.defineProperty(this, "currentEventTarget", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "detail", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "onUpdateEvent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                this.detail = event.detail ?? null;
                this.requestUpdate();
            }
        });
    }
    get eventName() {
        return this._eventName;
    }
    set eventName(value) {
        const next = value || 'qti:code:update';
        if (this._eventName === next)
            return;
        const prev = this._eventName;
        this._eventName = next;
        this.updateEventListener(prev, this._eventName, this._eventTarget);
    }
    get eventTarget() {
        return this._eventTarget;
    }
    set eventTarget(value) {
        if (this._eventTarget === value)
            return;
        this._eventTarget = value;
        this.updateEventListener(this._eventName, this._eventName, this._eventTarget);
    }
    get mode() {
        return this._mode;
    }
    set mode(value) {
        if (this._mode === value)
            return;
        this._mode = value;
        this.requestUpdate();
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        this.currentEventTarget = this.getEventTarget();
        this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent);
    }
    disconnectedCallback() {
        if (this.currentEventTarget) {
            this.currentEventTarget.removeEventListener(this.eventName, this.onUpdateEvent);
        }
        super.disconnectedCallback();
    }
    updateEventListener(prevEventName, nextEventName, nextTarget) {
        if (!this.isConnected)
            return;
        const target = nextTarget ?? document;
        const prevTarget = this.currentEventTarget ?? target;
        prevTarget.removeEventListener(prevEventName, this.onUpdateEvent);
        target.addEventListener(nextEventName, this.onUpdateEvent);
        this.currentEventTarget = target;
    }
    getEventTarget() {
        return this._eventTarget ?? document;
    }
    renderToolbar() {
        return html `
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
    render() {
        const htmlText = this.detail?.html ?? '';
        const jsonText = this.detail?.json ? JSON.stringify(this.detail.json, null, 2) : '';
        const xmlText = this.detail?.xml ?? '';
        const displayText = this._mode === 'html'
            ? this.formatHtml(htmlText)
            : this._mode === 'json'
                ? jsonText
                : xmlText;
        return html `
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
    formatHtml(html) {
        let formatted = '';
        let indent = 0;
        const indentStr = '  ';
        const parts = html.split(/(<[^>]+>)/g).filter(part => part.trim());
        for (const part of parts) {
            if (part.startsWith('</')) {
                indent = Math.max(0, indent - 1);
                formatted += indentStr.repeat(indent) + part + '\n';
            }
            else if (part.startsWith('<') && !part.endsWith('/>')) {
                formatted += indentStr.repeat(indent) + part + '\n';
                indent++;
            }
            else if (part.startsWith('<') && part.endsWith('/>')) {
                formatted += indentStr.repeat(indent) + part + '\n';
            }
            else {
                formatted += indentStr.repeat(indent) + part.trim() + '\n';
            }
        }
        return formatted.trim();
    }
};
QtiCodePanel = __decorate([
    customElement('qti-code-panel')
], QtiCodePanel);
export { QtiCodePanel };
export function defineExtension(options = {}) {
    return union(qtiCodePanelExtension({
        eventName: options.eventName ?? 'qti:code:update',
        eventTarget: options.eventTarget ?? document,
        emitOnInit: options.emitOnInit ?? true,
    }));
}
export { qtiCodePanelExtension };
