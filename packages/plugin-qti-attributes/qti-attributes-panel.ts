import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SidePanelEventDetail, SidePanelNodeDetail } from './index.js';

type AttrValue = string | number | boolean | null | undefined;

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends LitElement {
  private _eventName = 'qti:attributes:update';

  private _changeEventName = 'qti:attributes:change';

  private _eventTarget: EventTarget | null = null;

  private _editorView: {
    state: any;
    dispatch: (tr: any) => void;
  } | null = null;

  private nodes: SidePanelNodeDetail[] = [];

  private selectedIndex = 0;

  private currentEventTarget: EventTarget | null = null;

  get eventName() {
    return this._eventName;
  }

  set eventName(value: string) {
    const next = value || 'qti:attributes:update';
    if (this._eventName === next) return;
    const prev = this._eventName;
    this._eventName = next;
    this.updateEventListener(prev, this._eventName, this._eventTarget);
  }

  get changeEventName() {
    return this._changeEventName;
  }

  set changeEventName(value: string) {
    const next = value || 'qti:attributes:change';
    if (this._changeEventName === next) return;
    this._changeEventName = next;
  }

  get eventTarget() {
    return this._eventTarget;
  }

  set eventTarget(value: EventTarget | null) {
    if (this._eventTarget === value) return;
    this._eventTarget = value;
    this.updateEventListener(this._eventName, this._eventName, this._eventTarget);
  }

  get editorView() {
    return this._editorView;
  }

  set editorView(
    value: {
      state: any;
      dispatch: (tr: any) => void;
    } | null,
  ) {
    if (this._editorView === value) return;
    this._editorView = value;
  }

  override createRenderRoot() {
    return this;
  }

  private readonly onUpdateEvent = (event: Event) => {
    const detail = (event as CustomEvent<SidePanelEventDetail>).detail;
    this.nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];

    const requestedNode = detail?.activeNode;
    if (requestedNode) {
      const requestedIndex = this.nodes.findIndex(
        node => node.pos === requestedNode.pos && node.type === requestedNode.type,
      );
      this.selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
    } else if (this.selectedIndex >= this.nodes.length) {
      this.selectedIndex = 0;
    }

    this.requestUpdate();
  };

  connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
  }

  disconnectedCallback() {
    if (this.currentEventTarget) {
      this.currentEventTarget.removeEventListener(this.eventName, this.onUpdateEvent as EventListener);
    }
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

  private getEventTarget(): EventTarget {
    return this._eventTarget ?? document;
  }

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
    this.nodes = this.nodes.map((item, idx) => (idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item));
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent(this._changeEventName, {
        detail: {
          node: { ...node, attrs: nextAttrs },
          attrs: { [attrKey]: nextValue },
          pos: node.pos,
        },
        bubbles: true,
        composed: true,
      }),
    );

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
    if (typeof originalValue === 'number') {
      return input.value === '' ? null : Number(input.value);
    }
    if (input.value === '') return null;
    return input.value;
  }

  private renderField(key: string, value: AttrValue): TemplateResult {
    const type = typeof value;
    if (type === 'boolean') {
      return html`
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">${key}</span>
          <input
            class="checkbox checkbox-sm"
            type="checkbox"
            .checked=${Boolean(value)}
            @change=${(event: Event) => this.handleFieldChange(key, value, event)}
          />
        </label>
      `;
    }

    if (type === 'number') {
      return html`
        <label class="form-control w-full">
          <span class="mb-1 text-sm font-medium">${key}</span>
          <input
            class="input input-sm input-bordered w-full"
            type="number"
            .value=${String(value ?? '')}
            @input=${(event: Event) => this.handleFieldChange(key, value, event)}
          />
        </label>
      `;
    }

    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${key}</span>
        <input
          class="input input-sm input-bordered w-full"
          type="text"
          .value=${String(value ?? '')}
          @input=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  render() {
    const activeNode = this.activeNode;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);

    return html`
      <section class="qti-attributes-panel card shadow-xl">
        <div class="card-body gap-3 p-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h3 class="card-title text-base">QTI Interaction Attributes</h3>
              <p class="text-xs text-base-content/70">${activeNode?.type ?? 'No selection'}</p>
            </div>
          </header>

          ${this.nodes.length > 1
            ? html`
                <div class="flex flex-wrap gap-2">
                  ${this.nodes.map(
                    (node, index) => html`
                      <button
                        class="btn btn-xs ${index === this.selectedIndex ? 'btn-primary' : 'btn-ghost'}"
                        type="button"
                        @click=${() => this.setSelectedNode(index)}
                      >
                        ${node.type}
                      </button>
                    `,
                  )}
                </div>
              `
            : null}

          <div class="qti-attributes-content flex flex-col gap-3">
            ${activeNode
              ? attrEntries.length
                ? attrEntries.map(([key, value]) => this.renderField(key, value as AttrValue))
                : html`<p class="text-sm text-base-content/70">No editable attributes.</p>`
              : html`<p class="text-sm text-base-content/70">Place the cursor on a node with schema attributes.</p>`}
          </div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
