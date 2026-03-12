/**
 * QTI Attributes Panel - UI Component
 *
 * A Lit component for editing QTI node attributes.
 * Rendered in light DOM so it inherits the global DaisyUI theme.
 */

import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import type { SidePanelEventDetail, SidePanelNodeDetail } from '@qti-editor/core/attributes';

type AttrValue = string | number | boolean | null | undefined;

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends LitElement {
  override createRenderRoot() {
    return this;
  }

  private _eventName = 'qti:attributes:update';
  private _changeEventName = 'qti:attributes:change';
  private _eventTarget: EventTarget | null = null;
  private _editorView: { state: any; dispatch: (tr: any) => void } | null = null;
  private nodes: SidePanelNodeDetail[] = [];
  private selectedIndex = 0;
  private currentEventTarget: EventTarget | null = null;

  get eventName() { return this._eventName; }
  set eventName(value: string) {
    const next = value || 'qti:attributes:update';
    if (this._eventName === next) return;
    const prev = this._eventName;
    this._eventName = next;
    this.updateEventListener(prev, this._eventName, this._eventTarget);
  }

  get changeEventName() { return this._changeEventName; }
  set changeEventName(value: string) {
    const next = value || 'qti:attributes:change';
    if (this._changeEventName === next) return;
    this._changeEventName = next;
  }

  get eventTarget() { return this._eventTarget; }
  set eventTarget(value: EventTarget | null) {
    if (this._eventTarget === value) return;
    this._eventTarget = value;
    this.updateEventListener(this._eventName, this._eventName, this._eventTarget);
  }

  get editorView() { return this._editorView; }
  set editorView(value: { state: any; dispatch: (tr: any) => void } | null) {
    if (this._editorView === value) return;
    this._editorView = value;
  }

  private readonly onUpdateEvent = (event: Event) => {
    const detail = (event as CustomEvent<SidePanelEventDetail>).detail;
    this.nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];
    const requestedNode = detail?.activeNode;
    if (requestedNode) {
      const idx = this.nodes.findIndex(n => n.pos === requestedNode.pos && n.type === requestedNode.type);
      this.selectedIndex = idx >= 0 ? idx : 0;
    } else if (this.selectedIndex >= this.nodes.length) {
      this.selectedIndex = 0;
    }
    this.requestUpdate();
  };

  override connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
  }

  override disconnectedCallback() {
    this.currentEventTarget?.removeEventListener(this.eventName, this.onUpdateEvent as EventListener);
    super.disconnectedCallback();
  }

  private updateEventListener(prevEventName: string, nextEventName: string, nextTarget: EventTarget | null) {
    if (!this.isConnected) return;
    const target = nextTarget ?? document;
    const prevTarget = this.currentEventTarget ?? target;
    prevTarget.removeEventListener(prevEventName, this.onUpdateEvent as EventListener);
    target.addEventListener(nextEventName, this.onUpdateEvent as EventListener);
    this.currentEventTarget = target;
  }

  private getEventTarget(): EventTarget { return this._eventTarget ?? document; }

  private get activeNode(): SidePanelNodeDetail | null {
    if (this.nodes.length === 0) return null;
    if (this.selectedIndex >= this.nodes.length) return this.nodes[0] ?? null;
    return this.nodes[this.selectedIndex] ?? null;
  }

  private setSelectedNode(index: number) {
    this.selectedIndex = index;
    this.requestUpdate();
  }

  private handleFieldChange(attrKey: string, originalValue: AttrValue, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const nextValue = this.coerceValue(input, originalValue);
    const node = this.activeNode;
    if (!node) return;
    const nextAttrs = { ...node.attrs, [attrKey]: nextValue };
    this.nodes = this.nodes.map((item, idx) => idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent(this._changeEventName, {
      detail: { node: { ...node, attrs: nextAttrs }, attrs: { [attrKey]: nextValue }, pos: node.pos },
      bubbles: true,
      composed: true,
    }));
    this.applyNodeAttrs(node.pos, nextAttrs);
  }

  private applyNodeAttrs(pos: number, attrs: Record<string, any>) {
    const view = this._editorView;
    if (!view) return;
    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  }

  private coerceValue(input: HTMLInputElement, originalValue: AttrValue): AttrValue {
    if (input.type === 'checkbox') return input.checked;
    if (typeof originalValue === 'number') return input.value === '' ? null : Number(input.value);
    if (input.value === '') return null;
    return input.value;
  }

  protected renderField(key: string, value: AttrValue): TemplateResult {
    const type = typeof value;

    if (type === 'boolean') {
      return html`
        <label class="flex items-center justify-between gap-3 py-1.5 text-sm">
          <span class="text-base-content/80">${key}</span>
          <input
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
            .checked=${Boolean(value)}
            @change=${(e: Event) => this.handleFieldChange(key, value, e)}
          />
        </label>
      `;
    }

    if (type === 'number') {
      return html`
        <label class="block py-1.5">
          <span class="block text-xs text-base-content/70 mb-1">${key}</span>
          <input
            type="number"
            class="input input-sm w-full"
            .value=${String(value ?? '')}
            @input=${(e: Event) => this.handleFieldChange(key, value, e)}
          />
        </label>
      `;
    }

    return html`
      <label class="block py-1.5">
        <span class="block text-xs text-base-content/70 mb-1">${key}</span>
        <input
          type="text"
          class="input input-sm w-full"
          .value=${String(value ?? '')}
          @input=${(e: Event) => this.handleFieldChange(key, value, e)}
        />
      </label>
    `;
  }

  override render() {
    const activeNode = this.activeNode;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);

    return html`
      <div class="card bg-base-100 shadow-sm border border-base-300 overflow-hidden">
        <div class="bg-base-200 px-4 py-2.5 border-b border-base-300 flex items-center justify-between">
          <span class="text-sm font-semibold">Attributes</span>
          <span class="text-xs text-base-content/50">${activeNode?.type ?? ''}</span>
        </div>

        ${this.nodes.length > 1 ? html`
          <div class="flex flex-wrap gap-1 px-3 pt-3">
            ${this.nodes.map((node, index) => html`
              <button
                class="btn btn-xs ${index === this.selectedIndex ? 'btn-primary' : 'btn-ghost'}"
                type="button"
                @click=${() => this.setSelectedNode(index)}
              >${node.type}</button>
            `)}
          </div>
        ` : null}

        <div class="card-body px-3 flex flex-col gap-2 overflow-auto max-h-96">
          ${activeNode
            ? attrEntries.length
              ? attrEntries.map(([key, value]) => this.renderField(key, value as AttrValue))
              : html`<p class="text-xs text-base-content/50 py-1">No editable attributes.</p>`
            : html`<p class="text-xs text-base-content/50 py-1">Place the cursor on a node with schema attributes.</p>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
