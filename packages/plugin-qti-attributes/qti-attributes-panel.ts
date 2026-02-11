import {
  html,
  LitElement,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  QTI_ATTRIBUTES_ANCHOR_CLASS,
  QTI_ATTRIBUTES_ANCHOR_NAME,
} from './qti-attributes-panel.connector.js';

import {
  computePopoverSide,
  resolveAnchorElement,
  type PopoverSide,
} from './qti-attributes-panel.utils.js';
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
    dom?: ParentNode | null;
  } | null = null;

  private nodes: SidePanelNodeDetail[] = [];

  private selectedIndex = 0;

  private open = false;

  private currentEventTarget: EventTarget | null = null;

  private hasAnchor = false;

  private popoverSide: PopoverSide = 'right';

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
    this.updateEventListener(
      this._eventName,
      this._eventName,
      this._eventTarget,
    );
  }

  get editorView() {
    return this._editorView;
  }

  set editorView(
    value: {
      state: any;
      dispatch: (tr: any) => void;
      dom?: ParentNode | null;
    } | null,
  ) {
    if (this._editorView === value) return;
    this._editorView = value;
    this.syncAnchorState();
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
        (node) => node.pos === requestedNode.pos,
      );
      this.selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
    } else if (this.selectedIndex >= this.nodes.length) {
      this.selectedIndex = 0;
    }

    this.open =
      typeof detail?.open === 'boolean' ? detail.open : this.nodes.length > 0;
    this.syncAnchorState();
    this.requestUpdate();
  };

  connectedCallback() {
    super.connectedCallback();
    this.style.setProperty(
      '--qti-attributes-anchor-name',
      QTI_ATTRIBUTES_ANCHOR_NAME,
    );
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(
      this.eventName,
      this.onUpdateEvent as EventListener,
    );
    window.addEventListener('resize', this.handleViewportChange);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleViewportChange);
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
    prevTarget.removeEventListener(
      prevEventName,
      this.onUpdateEvent as EventListener,
    );
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

  private syncAnchorState() {
    this.style.setProperty(
      '--qti-attributes-anchor-name',
      QTI_ATTRIBUTES_ANCHOR_NAME,
    );
    const anchorElement = resolveAnchorElement(
      this._editorView as any,
      `.${QTI_ATTRIBUTES_ANCHOR_CLASS}`,
    );
    this.hasAnchor = Boolean(anchorElement);
    if (anchorElement) {
      this.popoverSide = computePopoverSide(anchorElement, window.innerWidth);
    }
  }

  private handleNodeDetailsToggle(index: number, event: Event) {
    const details = event.currentTarget as HTMLDetailsElement;
    if (!details.open) return;
    this.selectedIndex = index;
    this.syncAnchorState();
    this.requestUpdate();
  }

  private readonly handleViewportChange = () => {
    this.syncAnchorState();
    this.requestUpdate();
  };

  private handleOverlayClose() {
    this.open = false;
    this.requestUpdate();
  }

  private handlePopoverToggle(event: Event) {
    const popover = event.currentTarget as HTMLElement;
    if (!popover.matches(':popover-open') && this.open) {
      this.open = false;
      this.requestUpdate();
    }
  }

  private syncPopoverVisibility() {
    const popover = this.querySelector<HTMLElement>(
      '[data-qti-attributes-popover]',
    );
    if (!popover) return;

    if (this.open && !popover.matches(':popover-open')) {
      (popover as any).showPopover?.();
      return;
    }

    if (!this.open && popover.matches(':popover-open')) {
      (popover as any).hidePopover?.();
    }
  }

  private handleFieldChange(
    attrKey: string,
    originalValue: AttrValue,
    event: Event,
  ) {
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
      this.applyNodeAttrs(node, nextAttrs);
    }
  }

  private applyNodeAttrs(
    nodeDetail: SidePanelNodeDetail,
    attrs: Record<string, any>,
  ) {
    const view = this._editorView;
    if (!view) return;

    const resolveNodePos = (): number | null => {
      const candidatePositions = [
        nodeDetail.pos,
        nodeDetail.pos + 1,
        Math.max(0, nodeDetail.pos - 1),
      ];

      for (const pos of candidatePositions) {
        const candidate = view.state.doc.nodeAt(pos);
        if (candidate?.type?.name === nodeDetail.type) {
          return pos;
        }
      }

      const { $from } = view.state.selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        const candidate = $from.node(depth);
        if (candidate?.type?.name === nodeDetail.type) {
          return $from.before(depth);
        }
      }

      return null;
    };

    const pos = resolveNodePos();
    if (pos === null) return;

    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }),
    );
  }

  private coerceValue(
    input: HTMLInputElement,
    originalValue: AttrValue,
  ): AttrValue {
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
            @change=${(event: Event) =>
    this.handleFieldChange(key, value, event)}
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
            @input=${(event: Event) =>
    this.handleFieldChange(key, value, event)}
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
    const hasNodes = this.nodes.length > 0;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);

    return html`
      <section
        id="qti-attributes-popover"
        popover="manual"
        data-qti-attributes-popover
        class="qti-attributes-popover card shadow-xl ${this.hasAnchor
    ? ''
    : 'qti-attributes-popover--fallback'} ${this.popoverSide === 'left'
  ? 'qti-attributes-popover--left'
  : 'qti-attributes-popover--right'}"
        @toggle=${this.handlePopoverToggle}
      >
        <div class="card-body gap-3 p-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h3 class="card-title text-base">QTI Attributes</h3>
              <p class="text-xs text-base-content/70">
                ${hasNodes ? activeNode?.type : 'No selection'}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-ghost btn-circle btn-sm"
                type="button"
                aria-label="Close attribute popover"
                @click=${this.handleOverlayClose}
              >
                ✕
              </button>
            </div>
          </header>

          <div class="qti-attributes-content">
            ${hasNodes
    ? html`
                  ${this.nodes.length > 1
    ? html`
                        <div class="mb-3 flex flex-col gap-2">
                          ${this.nodes.map(
    (node, index) => html`
                              <details
                                name="qti-attribute-nodes"
                                class="collapse collapse-arrow border border-base-300 bg-base-100"
                                ?open=${index === this.selectedIndex}
                                @toggle=${(event: Event) =>
    this.handleNodeDetailsToggle(index, event)}
                              >
                                <summary class="collapse-title min-h-0 py-2 text-sm font-medium">
                                  ${node.type}
                                </summary>
                                <div class="collapse-content pb-2 text-xs text-base-content/70">
                                  Edit this node's attributes below.
                                </div>
                              </details>
                            `,
  )}
                        </div>
                      `
    : null}
                  <div class="flex flex-col gap-3">
                    ${attrEntries.length
    ? attrEntries.map(([key, value]) =>
      this.renderField(key, value as AttrValue),
    )
    : html`<p class="text-sm text-base-content/70">
                          No editable attributes.
                        </p>`}
                  </div>
                `
    : html`<p class="text-sm text-base-content/70">
                  Place the cursor in a supported QTI field.
                </p>`}
          </div>
        </div>
      </section>
    `;
  }

  override updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    this.syncAnchorState();
    this.syncPopoverVisibility();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
