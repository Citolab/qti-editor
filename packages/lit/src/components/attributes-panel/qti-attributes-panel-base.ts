import { html, LitElement, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SidePanelEventDetail, SidePanelNodeDetail } from '@qti-editor/core/attributes';

export { QtiAttributesPanelBase };

type AttrValue = string | number | boolean | null | undefined;

/**
 * Base attributes panel component.
 * 
 * This is a headless component - it provides functionality but minimal styling.
 * Extend this class or copy the registry version for full customization.
 * 
 * @fires qti:attributes:change - When an attribute value changes
 */
@customElement('qti-attributes-panel-base')
class QtiAttributesPanelBase extends LitElement {
  /**
   * Event name to listen for attribute updates.
   */
  @property({ type: String, attribute: 'event-name' })
  eventName = 'qti:attributes:update';

  /**
   * Event name dispatched when attributes change.
   */
  @property({ type: String, attribute: 'change-event-name' })
  changeEventName = 'qti:attributes:change';

  @state()
  protected nodes: SidePanelNodeDetail[] = [];

  @state()
  protected selectedIndex = 0;

  private _eventTarget: EventTarget = document;
  private _editorView: { state: any; dispatch: (tr: any) => void } | null = null;
  private _boundEventHandler: ((event: Event) => void) | null = null;

  /**
   * The event target to listen on.
   */
  get eventTarget(): EventTarget {
    return this._eventTarget;
  }

  set eventTarget(value: EventTarget) {
    const oldTarget = this._eventTarget;
    this._eventTarget = value;
    if (this.isConnected && oldTarget !== value) {
      this._unbindEventListener(oldTarget);
      this._bindEventListener(value);
    }
  }

  /**
   * The ProseMirror editor view for applying changes.
   */
  get editorView() {
    return this._editorView;
  }

  set editorView(value: { state: any; dispatch: (tr: any) => void } | null) {
    this._editorView = value;
  }

  /**
   * The currently active node.
   */
  get activeNode(): SidePanelNodeDetail | null {
    if (this.nodes.length === 0) return null;
    if (this.selectedIndex >= this.nodes.length) return this.nodes[0] ?? null;
    return this.nodes[this.selectedIndex] ?? null;
  }

  override createRenderRoot() {
    // Render in light DOM for easier styling
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEventListener(this._eventTarget);
  }

  disconnectedCallback() {
    this._unbindEventListener(this._eventTarget);
    super.disconnectedCallback();
  }

  private _bindEventListener(target: EventTarget) {
    this._boundEventHandler = this._handleUpdateEvent.bind(this);
    target.addEventListener(this.eventName, this._boundEventHandler);
  }

  private _unbindEventListener(target: EventTarget) {
    if (this._boundEventHandler) {
      target.removeEventListener(this.eventName, this._boundEventHandler);
      this._boundEventHandler = null;
    }
  }

  private _handleUpdateEvent(event: Event) {
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
  }

  /**
   * Select a node by index.
   */
  protected selectNode(index: number) {
    this.selectedIndex = index;
  }

  /**
   * Handle field value changes.
   */
  protected handleFieldChange(attrKey: string, originalValue: AttrValue, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const nextValue = this._coerceValue(input, originalValue);
    const node = this.activeNode;
    if (!node) return;

    const nextAttrs = { ...node.attrs, [attrKey]: nextValue };
    this.nodes = this.nodes.map((item, idx) => 
      idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item
    );

    this.dispatchEvent(
      new CustomEvent(this.changeEventName, {
        detail: {
          node: { ...node, attrs: nextAttrs },
          attrs: { [attrKey]: nextValue },
          pos: node.pos,
        },
        bubbles: true,
        composed: true,
      }),
    );

    this._applyNodeAttrs(node.pos, nextAttrs);
  }

  private _applyNodeAttrs(pos: number, attrs: Record<string, any>) {
    const view = this._editorView;
    if (!view) return;

    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  }

  private _coerceValue(input: HTMLInputElement, originalValue: AttrValue): AttrValue {
    if (input.type === 'checkbox') return input.checked;
    if (typeof originalValue === 'number') {
      return input.value === '' ? null : Number(input.value);
    }
    if (input.value === '') return null;
    return input.value;
  }

  /**
   * Render a field for an attribute.
   * Override this method to customize field rendering.
   */
  protected renderField(key: string, value: AttrValue): TemplateResult {
    const type = typeof value;
    
    if (type === 'boolean') {
      return html`
        <label>
          <span>${key}</span>
          <input
            type="checkbox"
            .checked=${Boolean(value)}
            @change=${(e: Event) => this.handleFieldChange(key, value, e)}
          />
        </label>
      `;
    }

    if (type === 'number') {
      return html`
        <label>
          <span>${key}</span>
          <input
            type="number"
            .value=${String(value ?? '')}
            @input=${(e: Event) => this.handleFieldChange(key, value, e)}
          />
        </label>
      `;
    }

    return html`
      <label>
        <span>${key}</span>
        <input
          type="text"
          .value=${String(value ?? '')}
          @input=${(e: Event) => this.handleFieldChange(key, value, e)}
        />
      </label>
    `;
  }

  /**
   * Render the component.
   * Override this method to customize the entire layout.
   */
  render() {
    const activeNode = this.activeNode;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);

    return html`
      <div class="qti-attributes-panel">
        <header>
          <h3>Attributes</h3>
          <p>${activeNode?.type ?? 'No selection'}</p>
        </header>

        ${this.nodes.length > 1
          ? html`
              <nav>
                ${this.nodes.map(
                  (node, index) => html`
                    <button
                      type="button"
                      ?data-active=${index === this.selectedIndex}
                      @click=${() => this.selectNode(index)}
                    >
                      ${node.type}
                    </button>
                  `,
                )}
              </nav>
            `
          : null}

        <div class="qti-attributes-fields">
          ${activeNode
            ? attrEntries.length
              ? attrEntries.map(([key, value]) => this.renderField(key, value as AttrValue))
              : html`<p>No editable attributes.</p>`
            : html`<p>Select a node with attributes.</p>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel-base': QtiAttributesPanelBase;
  }
}
