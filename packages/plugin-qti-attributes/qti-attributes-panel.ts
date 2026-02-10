import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SidePanelEventDetail, SidePanelNodeDetail } from './index.js';

type AttrValue = string | number | boolean | null | undefined;

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends LitElement {
  private readonly popoverWidth = 360;

  private readonly popoverMaxHeight = 420;

  private readonly viewportPadding = 12;

  private _eventName = 'qti:attributes:update';

  private _changeEventName = 'qti:attributes:change';

  private _eventTarget: EventTarget | null = null;

  private _editorView: { state: any; dispatch: (tr: any) => void } | null = null;

  private nodes: SidePanelNodeDetail[] = [];

  private selectedIndex = 0;

  private open = false;

  private currentEventTarget: EventTarget | null = null;

  private manualPosition: { left: number; top: number } | null = null;

  private dragging = false;

  private dragPointerId: number | null = null;

  private dragOffset = { x: 0, y: 0 };

  private lastActivePos: number | null = null;

  private connectorPath = '';

  private connectorOverlay: SVGSVGElement | null = null;

  private connectorPathElement: SVGPathElement | null = null;

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
    const requestedNode = detail?.activeNode;
    if (requestedNode) {
      const requestedIndex = this.nodes.findIndex((node) => node.pos === requestedNode.pos);
      this.selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
    } else if (this.selectedIndex >= this.nodes.length) {
      this.selectedIndex = 0;
    }

    const nextActivePos = requestedNode?.pos ?? null;
    if (this.lastActivePos !== null && nextActivePos !== this.lastActivePos) {
      this.manualPosition = null;
    }
    this.lastActivePos = nextActivePos;

    this.open = typeof detail?.open === 'boolean' ? detail.open : this.nodes.length > 0;
    this.requestUpdate();
  };

  connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(
      this.eventName,
      this.onUpdateEvent as EventListener,
    );
    this.ensureConnectorOverlay();
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('scroll', this.handleViewportChange, true);
  }

  disconnectedCallback() {
    this.removeConnectorOverlay();
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('scroll', this.handleViewportChange, true);
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
    this.requestUpdate();
  }

  private handleOverlayClose() {
    this.open = false;
    this.manualPosition = null;
    this.connectorPath = '';
    this.syncConnectorOverlay();
    this.requestUpdate();
  }

  private ensureConnectorOverlay() {
    if (this.connectorOverlay) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'fixed';
    svg.style.inset = '0';
    svg.style.width = '100vw';
    svg.style.height = '100vh';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '59';
    svg.style.overflow = 'visible';

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(37, 99, 235, 0.75)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '7 5');
    path.style.filter = 'drop-shadow(0 1px 1px rgba(15, 23, 42, 0.25))';
    path.style.vectorEffect = 'non-scaling-stroke';
    svg.appendChild(path);

    this.connectorOverlay = svg;
    this.connectorPathElement = path;
    document.body.appendChild(svg);
    this.syncConnectorOverlay();
  }

  private syncConnectorOverlay() {
    if (!this.connectorOverlay || !this.connectorPathElement) return;
    if (!this.open || !this.connectorPath) {
      this.connectorOverlay.style.display = 'none';
      this.connectorPathElement.removeAttribute('d');
      return;
    }
    this.connectorOverlay.style.display = 'block';
    this.connectorPathElement.setAttribute('d', this.connectorPath);
  }

  private removeConnectorOverlay() {
    if (!this.connectorOverlay) return;
    this.connectorOverlay.remove();
    this.connectorOverlay = null;
    this.connectorPathElement = null;
  }

  private readonly handleViewportChange = () => {
    if (!this.open || this.dragging) return;
    this.requestUpdate();
  };

  private getSelectionAnchor(): { left: number; right: number; top: number; bottom: number } | null {
    const view = this._editorView as any;
    const node = this.activeNode;
    const selection = view?.state?.selection;
    if (!view?.coordsAtPos) {
      return null;
    }

    // Prefer anchoring to the selected node element itself, not caret position.
    if (node && typeof view?.nodeDOM === 'function') {
      try {
        const rawNode = view.nodeDOM(node.pos) as Node | null;
        const element = rawNode instanceof Element ? rawNode : rawNode?.parentElement ?? null;
        if (element) {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.right,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        }
      } catch {
        // Fall back to positional coords when nodeDOM is unavailable for this node.
      }
    }

    const candidatePositions: number[] = [];
    if (selection) {
      candidatePositions.push(
        typeof selection.head === 'number' ? selection.head : selection.from,
      );
    }
    if (node) {
      candidatePositions.push(node.pos);
      candidatePositions.push(node.pos + 1);
    }

    for (const pos of candidatePositions) {
      try {
        const coords = view.coordsAtPos(pos) as {
          left: number;
          right: number;
          top: number;
          bottom: number;
        };
        if (coords) return coords;
      } catch {
        // Try next candidate position.
      }
    }

    return null;
  }

  private getPopoverStyle(): string {
    const anchor = this.getSelectionAnchor();
    if (!anchor) {
      this.connectorPath = '';
      return '';
    }

    const popoverWidth = Math.min(
      this.popoverWidth,
      window.innerWidth - this.viewportPadding * 2,
    );
    const popoverHeight = Math.min(
      this.popoverMaxHeight,
      window.innerHeight - this.viewportPadding * 2,
    );
    const gap = 100;
    const canPlaceRight =
      anchor.right + gap + popoverWidth <= window.innerWidth - this.viewportPadding;
    const canPlaceLeft = anchor.left - gap - popoverWidth >= this.viewportPadding;
    const placeRight = canPlaceRight
      ? true
      : canPlaceLeft
        ? false
        : window.innerWidth - anchor.right >= anchor.left;

    let left = this.manualPosition
      ? this.manualPosition.left
      : placeRight
        ? anchor.right + gap
        : anchor.left - popoverWidth - gap;
    left = Math.max(
      this.viewportPadding,
      Math.min(left, window.innerWidth - popoverWidth - this.viewportPadding),
    );

    let top = this.manualPosition ? this.manualPosition.top : anchor.top;
    if (top + popoverHeight > window.innerHeight - this.viewportPadding) {
      top = window.innerHeight - popoverHeight - this.viewportPadding;
    }
    top = Math.max(
      this.viewportPadding,
      Math.min(top, window.innerHeight - popoverHeight - this.viewportPadding),
    );

    const anchorX = (anchor.left + anchor.right) / 2;
    const anchorY = (anchor.top + anchor.bottom) / 2;
    const popoverLeft = left;
    const popoverRight = left + popoverWidth;
    const popoverTop = top;
    const popoverBottom = top + popoverHeight;

    const tetherOffset = 10;
    let endX = popoverLeft - tetherOffset;
    if (anchorX > popoverRight) {
      endX = popoverRight + tetherOffset;
    } else if (anchorX > popoverLeft) {
      endX =
        anchorX >= (popoverLeft + popoverRight) / 2
          ? popoverRight + tetherOffset
          : popoverLeft - tetherOffset;
    }
    const endY = Math.max(popoverTop + 16, Math.min(anchorY, popoverBottom - 16));
    const controlOffset = Math.max(28, Math.min(120, Math.abs(endX - anchorX) * 0.45));
    const c1x = anchorX < endX ? anchorX + controlOffset : anchorX - controlOffset;
    const c2x = anchorX < endX ? endX - controlOffset : endX + controlOffset;
    this.connectorPath = `M ${anchorX} ${anchorY} C ${c1x} ${anchorY}, ${c2x} ${endY}, ${endX} ${endY}`;

    return `left:${left}px;top:${top}px;`;
  }

  private clampPosition(left: number, top: number): { left: number; top: number } {
    const popoverWidth = Math.min(
      this.popoverWidth,
      window.innerWidth - this.viewportPadding * 2,
    );
    const popoverHeight = Math.min(
      this.popoverMaxHeight,
      window.innerHeight - this.viewportPadding * 2,
    );

    const clampedLeft = Math.max(
      this.viewportPadding,
      Math.min(left, window.innerWidth - popoverWidth - this.viewportPadding),
    );
    const clampedTop = Math.max(
      this.viewportPadding,
      Math.min(top, window.innerHeight - popoverHeight - this.viewportPadding),
    );

    return { left: clampedLeft, top: clampedTop };
  }

  private readonly handleDragMove = (event: PointerEvent) => {
    if (!this.dragging || this.dragPointerId !== event.pointerId) return;
    event.preventDefault();
    const left = event.clientX - this.dragOffset.x;
    const top = event.clientY - this.dragOffset.y;
    this.manualPosition = this.clampPosition(left, top);
    this.requestUpdate();
  };

  private readonly handleDragEnd = (event: PointerEvent) => {
    if (this.dragPointerId !== event.pointerId) return;
    this.dragging = false;
    this.dragPointerId = null;
    window.removeEventListener('pointermove', this.handleDragMove);
    window.removeEventListener('pointerup', this.handleDragEnd);
    window.removeEventListener('pointercancel', this.handleDragEnd);
  };

  private handleDragStart(event: PointerEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.header-actions')) return;

    const popover = this.renderRoot.querySelector('.popover') as HTMLElement | null;
    if (!popover) return;

    const rect = popover.getBoundingClientRect();
    this.dragging = true;
    this.dragPointerId = event.pointerId;
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.manualPosition = this.clampPosition(rect.left, rect.top);
    window.addEventListener('pointermove', this.handleDragMove);
    window.addEventListener('pointerup', this.handleDragEnd);
    window.addEventListener('pointercancel', this.handleDragEnd);
    event.preventDefault();
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
    if (!this.open) {
      this.connectorPath = '';
      this.syncConnectorOverlay();
      return null;
    }

    const activeNode = this.activeNode;
    const hasNodes = this.nodes.length > 0;
    const attrs = activeNode?.attrs ?? {};
    const attrEntries = Object.entries(attrs);
    const popoverStyle = this.getPopoverStyle();

    return html`
      <section class="popover" role="dialog" aria-label="QTI Attributes" style=${popoverStyle}>
        <header class="header" @pointerdown=${this.handleDragStart}>
          <div>
            <div class="title">QTI Attributes</div>
            <div class="subtitle">${hasNodes ? activeNode?.type : 'No selection'}</div>
          </div>
          <div class="header-actions">
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
            <button
              class="close-button"
              type="button"
              aria-label="Close attribute popover"
              @click=${this.handleOverlayClose}
            >
              &times;
            </button>
          </div>
        </header>

        <div class="content">
          ${hasNodes
    ? html`
                <div class="fields">
                  ${attrEntries.length
    ? attrEntries.map(([key, value]) => this.renderField(key, value as AttrValue))
    : html`<div class="empty">No editable attributes.</div>`}
                </div>
              `
    : html`<div class="empty">Place the cursor in a supported QTI field.</div>`}
        </div>
      </section>
    `;
  }

  override updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    this.syncConnectorOverlay();
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 60;
      pointer-events: none;
      display: block;
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    .popover {
      pointer-events: auto;
      position: absolute;
      z-index: 2;
      width: min(360px, calc(100vw - 24px));
      max-height: min(420px, calc(100vh - 24px));
      overflow: visible;
      box-sizing: border-box;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      padding: 14px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
      animation: pop-in 120ms ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      margin-bottom: 10px;
      cursor: move;
      user-select: none;
    }

    .content {
      max-height: calc(min(420px, calc(100vh - 24px)) - 72px);
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 2px;
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .close-button {
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: #fff;
      color: #0f172a;
      width: 28px;
      height: 28px;
      font-size: 18px;
      font-weight: 500;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
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

    @keyframes pop-in {
      from {
        opacity: 0;
        transform: translateY(4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
