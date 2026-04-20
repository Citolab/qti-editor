import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { TextSelection } from 'prosemirror-state';

import type { Editor } from 'prosekit/core';

interface ItemInfo {
  index: number;
  pos: number;
}

/**
 * QTI Items Navigator
 * 
 * Displays a numbered list of QTI assessment items in the editor,
 * separated by qti-item-divider elements. Clicking an item navigates
 * to that position in the editor.
 */
@customElement('qti-items-navigator')
export class QtiItemsNavigator extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .navigator-container {
      border-radius: 0.5rem;
      border: 1px solid hsl(var(--border, 220 13% 91%));
      background: white;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .navigator-header {
      border-bottom: 1px solid hsl(var(--border, 220 13% 91%));
      padding: 0.75rem 1rem;
    }

    .navigator-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: hsl(var(--foreground, 220 9% 10%));
      margin: 0 0 0.25rem 0;
    }

    .navigator-subtitle {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground, 220 9% 46%));
      margin: 0;
    }

    .items-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item-button {
      width: 100%;
      border: none;
      background: none;
      text-align: left;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s;
      border-left: 4px solid transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid hsl(var(--border, 220 13% 91%));
    }

    .item-button:last-child {
      border-bottom: none;
    }

    .item-button:hover {
      background-color: hsl(var(--muted, 220 13% 95%));
    }

    .item-button:focus {
      outline: 2px solid hsl(var(--ring, 221 83% 53%));
      outline-offset: -2px;
      background-color: hsl(var(--muted, 220 13% 95%));
    }

    .item-button.active {
      background-color: hsl(221 83% 95%);
      border-left-color: hsl(var(--primary, 221 83% 53%));
    }

    .item-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: hsl(var(--foreground, 220 9% 10%));
    }

    .item-button.active .item-label {
      color: hsl(221 83% 30%);
    }

    .active-indicator {
      width: 1rem;
      height: 1rem;
      color: hsl(var(--primary, 221 83% 53%));
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: hsl(var(--muted-foreground, 220 9% 46%));
      font-size: 0.875rem;
    }
  `;

  @property({ attribute: false })
  editor: Editor | null = null;

  @property()
  itemDividerNodeType = 'qtiItemDivider';

  @property()
  changeEventName = 'qti:editor:change';

  @property()
  selectionEventName = 'qti:editor:selection';

  @state()
  private items: ItemInfo[] = [];

  @state()
  private currentItemIndex = 0;

  private detectionScheduled = false;
  private scrollContainer: HTMLElement | null = null;

  override connectedCallback() {
    super.connectedCallback();
    
    // Listen for scroll-based item changes from gutter on document
    document.addEventListener('gutter:item-change', this.handleGutterItemChange as EventListener);
    
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
    document.removeEventListener('gutter:item-change', this.handleGutterItemChange as EventListener);
    this.removeEditorListeners();
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('editor')) {
      this.removeEditorListeners();

      if (this.editor) {
        this.setupEditorListeners();
        
        // Initial detection with a small delay to ensure editor is ready
        setTimeout(() => {
          this.detectItems();
          this.updateCurrentItem();
        }, 100);
      }
    }
  }

  private setupEditorListeners() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.dom) return;

    // Find the scrolling container (same logic as gutter)
    const viewDomStyle = window.getComputedStyle(view.dom);
    if (viewDomStyle.overflowY === 'auto' || viewDomStyle.overflowY === 'scroll') {
      this.scrollContainer = view.dom;
    } else {
      let element = view.dom.parentElement;
      while (element) {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          this.scrollContainer = element;
          break;
        }
        element = element.parentElement;
      }
    }

    view.dom.addEventListener(this.changeEventName, this.handleEditorChange);
    view.dom.addEventListener(this.selectionEventName, this.handleSelectionChange);
    
    // Also listen on the document for the editor ready event
    document.addEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private removeEditorListeners() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.dom) return;

    view.dom.removeEventListener(this.changeEventName, this.handleEditorChange);
    view.dom.removeEventListener(this.selectionEventName, this.handleSelectionChange);
    
    document.removeEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private handleEditorReady = () => {
    // Set up listeners now that editor is mounted
    this.setupEditorListeners();
    
    setTimeout(() => {
      this.detectItems();
      this.updateCurrentItem();
    }, 100);
  };

  private handleEditorChange = () => {
    this.scheduleDetection();
    this.updateCurrentItem();
  };

  private handleSelectionChange = () => {
    // Immediately update which item is current - this should be instant
    this.updateCurrentItem();
  };

  private handleGutterItemChange = (event: CustomEvent) => {
    console.log('[NAVIGATOR] Received gutter:item-change event, newIndex:', event.detail.itemIndex);
    // Update current item when gutter detects scroll-based change
    const newIndex = event.detail.itemIndex;
    if (this.currentItemIndex !== newIndex) {
      console.log('[NAVIGATOR] Updating currentItemIndex from', this.currentItemIndex, 'to', newIndex);
      this.currentItemIndex = newIndex;
      this.requestUpdate();
    } else {
      console.log('[NAVIGATOR] Item index unchanged, not updating');
    }
  };

  private scheduleDetection() {
    if (this.detectionScheduled) return;
    
    this.detectionScheduled = true;
    requestAnimationFrame(() => {
      this.detectItems();
      this.detectionScheduled = false;
    });
  }

  private detectItems() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc } = view.state;
    const itemPositions: ItemInfo[] = [];
    let itemIndex = 0;

    // First item always starts at the beginning
    itemPositions.push({
      index: itemIndex++,
      pos: 1,
    });

    // Find all dividers
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === this.itemDividerNodeType) {
        // New item starts after the divider
        itemPositions.push({
          index: itemIndex++,
          pos: pos + node.nodeSize,
        });
      }
    });

    // Only update if items changed
    const itemsChanged = 
      this.items.length !== itemPositions.length ||
      this.items.some((item, i) => item.pos !== itemPositions[i]?.pos);
    
    if (itemsChanged) {
      this.items = itemPositions;
      this.requestUpdate(); // Force re-render
    }
  }

  private updateCurrentItem() {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state) return;

    const cursorPos = view.state.selection.from;

    // Find which item the cursor is in
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (cursorPos >= this.items[i].pos) {
        this.currentItemIndex = i;
        break;
      }
    }
  }

  private navigateToItem(itemIndex: number) {
    if (!this.editor) return;

    const view = (this.editor as any).view;
    if (!view?.state || !view?.dispatch) return;

    const item = this.items[itemIndex];
    if (!item) return;

    // Immediately update UI for instant visual feedback
    this.currentItemIndex = itemIndex;
    this.requestUpdate();

    const { state } = view;
    const tr = state.tr;

    // Find the first valid selection position at or after the target position
    const $pos = state.doc.resolve(item.pos);
    let targetPos = item.pos;
    
    // If we're at a position that can't hold a text selection, find the next valid position
    if (!$pos.parent.inlineContent) {
      // Find next position with inline content (limit search to next 500 positions)
      const searchEnd = Math.min(item.pos + 500, state.doc.content.size);
      state.doc.nodesBetween(item.pos, searchEnd, (node: any, pos: number) => {
        if (node.inlineContent && node.content.size > 0) {
          targetPos = pos + 1; // Position inside the node
          return false; // Stop searching
        }
      });
    }

    // Set selection to the valid position
    const selection = TextSelection.create(state.doc, targetPos);
    tr.setSelection(selection);

    view.dispatch(tr);
    
    // Scroll to the divider position (item.pos) explicitly for consistent behavior
    if (this.scrollContainer) {
      const dividerCoords = view.coordsAtPos(item.pos);
      const containerRect = this.scrollContainer.getBoundingClientRect();
      // Scroll so the item is near the top (with some padding)
      const scrollOffset = dividerCoords.top - containerRect.top - 100;
      this.scrollContainer.scrollTop += scrollOffset;
    }
    
    // Manually dispatch selection change event so other components (like gutter) can update
    view.dom.dispatchEvent(new CustomEvent(this.selectionEventName, {
      bubbles: true,
      detail: { selection }
    }));
    
    view.focus();
  }

  override render() {
    if (!this.editor) {
      return html`
        <div class="navigator-container">
          <div class="empty-state">
            Editor not ready
          </div>
        </div>
      `;
    }

    const view = (this.editor as any).view;
    if (!view?.state?.doc) {
      return html`
        <div class="navigator-container">
          <div class="empty-state">
            Waiting for editor...
          </div>
        </div>
      `;
    }

    return html`
      <div class="navigator-container">
        <div class="navigator-header">
          <h3 class="navigator-title">Assessment Items</h3>
          <p class="navigator-subtitle">
            ${this.items.length} ${this.items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <ul class="items-list">
          ${this.items.map(
            (item) => html`
              <li>
                <button
                  class="item-button ${this.currentItemIndex === item.index ? 'active' : ''}"
                  @click=${() => this.navigateToItem(item.index)}
                >
                  <span class="item-label">Item ${item.index + 1}</span>
                  ${this.currentItemIndex === item.index
                    ? html`
                        <svg class="active-indicator" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      `
                    : ''}
                </button>
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-items-navigator': QtiItemsNavigator;
  }
}
