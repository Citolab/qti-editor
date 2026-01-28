import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SidePanelEventDetail, SidePanelNodeDetail } from './index.js';

type AttrValue = string | number | boolean | null | undefined;

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends LitElement {
  private _eventName = 'qti:attributes:update';

  private _changeEventName = 'qti:attributes:change';

  private _eventTarget: EventTarget | null = null;

  private _editorView: { state: any; dispatch: (tr: any) => void } | null = null;

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

  set editorView(value: { state: any; dispatch: (tr: any) => void } | null) {
    if (this._editorView === value) return;
    this._editorView = value;
  }

  private readonly onUpdateEvent = (event: Event) => {
    const detail = (event as CustomEvent<SidePanelEventDetail>).detail;
    this.nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];
    this.selectedIndex = 0;
    this.requestUpdate();
  };

  connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(
      this.eventName,
      this.onUpdateEvent as EventListener,
    );
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

  private get activeNode(): SidePanelNodeDetail | null {
    if (this.nodes.length === 0) return null;
    if (this.selectedIndex >= this.nodes.length) return this.nodes[0] ?? null;
    return this.nodes[this.selectedIndex] ?? null;
  }

  private handleNodeSelect(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    this.selectedIndex = Number(target.value);
  }

  private handleFieldChange(attrKey: string, originalValue: AttrValue, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const nextValue = this.coerceValue(input, originalValue);
    const node = this.activeNode;
    if (!node) return;

    const nextAttrs = { ...node.attrs, [attrKey]: nextValue };
    this.nodes = this.nodes.map((item, idx) =>
      idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item,
    );
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

    if (this._editorView) {
      this.applyNodeAttrs(node.pos, nextAttrs);
    }
  }

  private applyNodeAttrs(pos: number, attrs: Record<string, any>) {
    const view = this._editorView;
    if (!view) return;
    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  }

  private coerceValue(input: HTMLInputElement, originalValue: AttrValue): AttrValue {
    if (input.type === 'checkbox') {
      return input.checked;
    }
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
        <label class="field">
          <span>${key}</span>
          <input
            type="checkbox"
            .checked=${Boolean(value)}
            @change=${(event: Event) => this.handleFieldChange(key, value, event)}
          />
        </label>
      `;
    }

    if (type === 'number') {
      return html`
        <label class="field">
          <span>${key}</span>
          <input
            type="number"
            .value=${String(value ?? '')}
            @input=${(event: Event) => this.handleFieldChange(key, value, event)}
          />
        </label>
      `;
    }

    return html`
      <label class="field">
        <span>${key}</span>
        <input
          type="text"
          .value=${String(value ?? '')}
          @input=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  render() {
    const activeNode = this.activeNode;
    const hasNodes = this.nodes.length > 0;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);

    return html`
      <section class="panel ${hasNodes ? 'open' : ''}">
        <header class="header">
          <div>
            <div class="title">QTI Attributes</div>
            <div class="subtitle">${hasNodes ? activeNode?.type : 'No selection'}</div>
          </div>
          ${this.nodes.length > 1
            ? html`
                <select class="node-select" @change=${this.handleNodeSelect}>
                  ${this.nodes.map(
                    (node, index) => html`
                      <option value=${index} ?selected=${index === this.selectedIndex}>
                        ${node.type}
                      </option>
                    `,
                  )}
                </select>
              `
            : null}
        </header>

        ${hasNodes
          ? html`
              <div class="fields">
                ${attrEntries.length
                  ? attrEntries.map(([key, value]) => this.renderField(key, value as AttrValue))
                  : html`<div class="empty">No editable attributes.</div>`}
              </div>
            `
          : html`<div class="empty">Select a QTI interaction to edit attributes.</div>`}
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
      padding: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
      opacity: 0.6;
      transform: translateY(8px);
      transition: opacity 200ms ease, transform 200ms ease;
    }

    .panel.open {
      opacity: 1;
      transform: translateY(0);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      margin-bottom: 16px;
    }

    .title {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.02em;
    }

    .subtitle {
      font-size: 0.85rem;
      color: #64748b;
    }

    .node-select {
      border-radius: 10px;
      padding: 6px 10px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: #fff;
      font-size: 0.85rem;
    }

    .fields {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }

    .field span {
      font-weight: 600;
      font-size: 0.85rem;
      color: #1e293b;
    }

    .field input[type='text'],
    .field input[type='number'] {
      flex: 1;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 6px 10px;
      font-size: 0.85rem;
    }

    .field input[type='checkbox'] {
      width: 18px;
      height: 18px;
    }

    .empty {
      font-size: 0.9rem;
      color: #64748b;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
