import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { TextSelection } from 'prosemirror-state';

import type { Editor } from 'prosekit/core';

interface ItemPosition {
  index: number;
  top: number; // Vertical position in pixels
}

/**
 * QTI Items Gutter
 * 
 * Displays item numbers in a left gutter/sidebar, similar to line numbers in VS Code.
 * Shows which item each section of the document belongs to, synchronized with
 * the items-navigator component.
 */
@customElement('qti-items-gutter')
export class QtiItemsGutter extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3rem;
      background: hsl(var(--muted, 220 13% 95%) / 0.5);
      border-right: 1px solid hsl(var(--border, 220 13% 91%));
      overflow: hidden;
      user-select: none;
      z-index: 1;
    }

    .gutter-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .item-marker {
      position: absolute;
      left: 0;
      width: 100%;
      padding: 0.25rem 0.5rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: hsl(var(--muted-foreground, 220 9% 46%));
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .item-marker:hover {
      background: hsl(var(--muted, 220 13% 95%));
      color: hsl(var(--foreground, 220 9% 10%));
    }

    .item-marker.active {
      background: hsl(221 83% 95%);
      color: hsl(221 83% 30%);
      font-weight: 700;
    }

    .item-marker.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: hsl(var(--primary, 221 83% 53%));
    }
  `;

  @property({ attribute: false })
  editor: Editor | null = null;

  @property()
  itemDividerNodeType = 'qtiItemDivider';

  @state()
  private itemPositions: ItemPosition[] = [];

  @state()
  private currentItemIndex = 0;

  private scrollContainer: HTMLElement | null = null;
  private positionUpdateScheduled = false;

  override connectedCallback() {
    super.connectedCallback();
    
    // If editor is already set when we connect, check if it's mounted
    if (this.editor) {
      let view = null;
      try {
        view = (this.editor as any).view;
      } catch (e) {
        // Editor not mounted yet
      }
      
      if (view) {
        this.setupEditorListeners();
        
        // Initial detection with a small delay to ensure editor is ready
        setTimeout(() => {
          this.detectItems();
          this.calculateItemPositions();
          this.updateCurrentItem();
        }, 100);
      } else {
        // Listen for editor ready event
        document.addEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEditorListeners();
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('editor')) {
      this.removeEditorListeners();

      if (this.editor) {
        this.setupEditorListeners();
        
        // Initial detection with a small delay
        setTimeout(() => {
          this.detectItems();
          this.calculateItemPositions();
          this.updateCurrentItem();
        }, 100);
      }
    }
  }

  private setupEditorListeners() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.dom) return;

    // Find the scrolling container
    // Check view.dom itself first (it might be the scroll container)
    let scrollElement: HTMLElement | null = null;
    const viewDomStyle = window.getComputedStyle(view.dom);
    
    if (viewDomStyle.overflowY === 'auto' || viewDomStyle.overflowY === 'scroll') {
      scrollElement = view.dom;
    } else {
      // Traverse up to find scrolling ancestor
      let element = view.dom.parentElement;
      let depth = 0;
      while (element && depth < 10) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          scrollElement = element;
          break;
        }
        element = element.parentElement;
        depth++;
      }
    }
    
    this.scrollContainer = scrollElement;
    if (!this.scrollContainer) return;

    view.dom.addEventListener('qti:editor:change', this.handleEditorChange);
    view.dom.addEventListener('qti:editor:selection', this.handleSelectionChange);
    this.scrollContainer.addEventListener('scroll', this.handleScroll);
    
    document.addEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private removeEditorListeners() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.dom) return;

    view.dom.removeEventListener('qti:editor:change', this.handleEditorChange);
    view.dom.removeEventListener('qti:editor:selection', this.handleSelectionChange);
    
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }
    
    document.removeEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private handleEditorReady = () => {
    // Set up listeners now that editor is mounted
    this.setupEditorListeners();
    
    setTimeout(() => {
      this.detectItems();
      this.calculateItemPositions();
      this.updateCurrentItem();
    }, 100);
  };

  private handleEditorChange = () => {
    this.detectItems();
    this.schedulePositionUpdate();
    this.updateCurrentItem();
  };

  private handleSelectionChange = () => {
    // Immediately update which item is current - this should be instant
    this.updateCurrentItem();
  };

  private schedulePositionUpdate() {
    if (this.positionUpdateScheduled) return;
    
    this.positionUpdateScheduled = true;
    requestAnimationFrame(() => {
      this.calculateItemPositions();
      this.positionUpdateScheduled = false;
    });
  }

  private handleScroll = () => {
    // Recalculate positions on scroll to keep markers aligned with content
    this.calculateItemPositions();
    // Also update which item is "active" based on scroll position
    this.updateCurrentItemFromScroll();
  };

  private detectItems() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc } = view.state;
    const items: { index: number; pos: number }[] = [];
    let itemIndex = 0;

    // First item starts at beginning
    items.push({ index: itemIndex++, pos: 1 });

    // Find all dividers
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === this.itemDividerNodeType) {
        items.push({ index: itemIndex++, pos: pos + node.nodeSize });
      }
    });

    this.calculateItemPositions();
  }

  private calculateItemPositions() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc } = view.state;
    const positions: ItemPosition[] = [];
    let itemIndex = 0;

    if (!this.scrollContainer) return;

    // Get the gutter's position to calculate relative positions
    const gutterRect = this.getBoundingClientRect();

    // Calculate positions using viewport coordinates directly (no scroll offset needed)
    try {
      const firstCoords = view.coordsAtPos(1);
      if (firstCoords) {
        // Position relative to gutter's top edge
        const relativeTop = firstCoords.top - gutterRect.top;
        positions.push({
          index: itemIndex++,
          top: relativeTop,
        });
      }
    } catch (e) {
      // Ignore
    }

    // Find dividers and calculate their positions
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === this.itemDividerNodeType) {
        const itemStartPos = pos + node.nodeSize;
        try {
          const coords = view.coordsAtPos(itemStartPos);
          if (coords) {
            // Position relative to gutter's top edge
            const relativeTop = coords.top - gutterRect.top;
            positions.push({
              index: itemIndex++,
              top: relativeTop,
            });
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    this.itemPositions = positions;
    // Explicitly trigger re-render to ensure markers appear
    this.requestUpdate();
  }

  private updateCurrentItem() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const cursorPos = view.state.selection.from;
    const { doc } = view.state;
    
    let currentIndex = 0;
    let itemIndex = 0;
    
    // First item
    if (cursorPos >= 1) {
      currentIndex = itemIndex;
    }
    itemIndex++;

    // Check dividers
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === this.itemDividerNodeType) {
        const itemStartPos = pos + node.nodeSize;
        if (cursorPos >= itemStartPos) {
          currentIndex = itemIndex;
        }
        itemIndex++;
      }
    });

    const oldIndex = this.currentItemIndex;
    this.currentItemIndex = currentIndex;
    
    if (oldIndex !== currentIndex) {
      // Trigger re-render to update active state
      this.requestUpdate();
    }
  }

  private updateCurrentItemFromScroll() {
    if (!this.editor || !this.scrollContainer) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc } = view.state;
    
    // Get container position
    const containerRect = this.scrollContainer.getBoundingClientRect();
    
    // Find which item is at the top of the viewport (with offset for better UX)
    // Use 1/3 of viewport height so highlighting switches when approaching next item
    const viewportHeight = containerRect.height;
    const targetViewportY = containerRect.top + (viewportHeight / 3);
    
    let currentIndex = 0;
    let itemIndex = 0;
    
    // Check first item
    try {
      const firstCoords = view.coordsAtPos(1);
      if (firstCoords.top <= targetViewportY) {
        currentIndex = itemIndex;
      }
    } catch (e) {
      // Ignore
    }
    itemIndex++;

    // Check dividers
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === this.itemDividerNodeType) {
        const itemStartPos = pos + node.nodeSize;
        try {
          const coords = view.coordsAtPos(itemStartPos);
          if (coords.top <= targetViewportY) {
            currentIndex = itemIndex;
          }
        } catch (e) {
          // Ignore
        }
        itemIndex++;
      }
    });

    const oldIndex = this.currentItemIndex;
    this.currentItemIndex = currentIndex;
    
    if (oldIndex !== currentIndex) {
      // Dispatch event so items-navigator can also update
      this.dispatchEvent(new CustomEvent('gutter:item-change', {
        bubbles: true,
        composed: true,
        detail: { itemIndex: currentIndex }
      }));
      this.requestUpdate();
    }
  }

  private navigateToItem(itemIndex: number) {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc } = view.state;
    let targetPos = 1;
    let currentIndex = 0;

    if (itemIndex === 0) {
      targetPos = 1;
    } else {
      doc.descendants((node: any, pos: number) => {
        if (node.type.name === this.itemDividerNodeType) {
          currentIndex++;
          if (currentIndex === itemIndex) {
            targetPos = pos + node.nodeSize;
            return false;
          }
        }
      });
    }

    const { state } = view;
    const tr = state.tr;
    
    const selection = TextSelection.create(state.doc, targetPos);
    tr.setSelection(selection);
    tr.scrollIntoView();
    view.dispatch(tr);
    view.focus();
  }

  override render() {
    if (!this.editor || this.itemPositions.length === 0) {
      return html`<div class="gutter-container"></div>`;
    }

    return html`
      <div class="gutter-container">
        ${this.itemPositions.map(
          (item) => html`
            <div
              class="item-marker ${this.currentItemIndex === item.index ? 'active' : ''}"
              style="top: ${item.top}px;"
              @click=${() => this.navigateToItem(item.index)}
              title="Item ${item.index + 1}"
            >
              ${item.index + 1}
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-items-gutter': QtiItemsGutter;
  }
}
