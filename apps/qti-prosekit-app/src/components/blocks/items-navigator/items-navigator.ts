import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { TextSelection } from 'prosemirror-state';

import styles from './items-navigator.styles.js';

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
  static override styles = styles;

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
    
    // Listen for native selection changes to track cursor position
    document.addEventListener('selectionchange', this.handleNativeSelectionChange);
    
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
    document.removeEventListener('selectionchange', this.handleNativeSelectionChange);
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

  private handleNativeSelectionChange = () => {
    // Check if selection is within our editor
    if (!this.editor) return;
    const view = (this.editor as any).view;
    if (!view?.dom) return;

    // Check if the native selection is inside the editor
    const nativeSelection = document.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) return;
    
    const range = nativeSelection.getRangeAt(0);
    if (view.dom.contains(range.startContainer)) {
      // Use requestAnimationFrame to ensure ProseMirror has synced its selection state
      requestAnimationFrame(() => {
        this.updateCurrentItem();
      });
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
    let newIndex = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (cursorPos >= this.items[i].pos) {
        newIndex = i;
        break;
      }
    }

    if (this.currentItemIndex !== newIndex) {
      this.currentItemIndex = newIndex;
      this.requestUpdate();
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
    let found = false;
    
    // If we're at a position that can't hold a text selection, find the next valid position
    if (!$pos.parent.inlineContent) {
      // Find next position with inline content (limit search to next 500 positions)
      const searchEnd = Math.min(item.pos + 500, state.doc.content.size);
      state.doc.nodesBetween(item.pos, searchEnd, (node: any, pos: number) => {
        if (found) return false;
        // Accept any node with inline content (including empty paragraphs)
        if (node.inlineContent) {
          targetPos = pos + 1; // Position inside the node
          found = true;
          return false; // Stop searching
        }
      });
    }

    // Only create selection if we found a valid position
    try {
      const selection = TextSelection.create(state.doc, targetPos);
      tr.setSelection(selection);
      view.dispatch(tr);
      
      // Dispatch selection change event so other components (like gutter) can update
      view.dom.dispatchEvent(new CustomEvent(this.selectionEventName, {
        bubbles: true,
        detail: { selection }
      }));
    } catch (e) {
      // If selection fails, just scroll without cursor placement
      console.warn('[ItemsNavigator] Could not place cursor at position', targetPos);
    }
    
    // Scroll to the item position explicitly for consistent behavior
    if (this.scrollContainer) {
      const dividerCoords = view.coordsAtPos(item.pos);
      const containerRect = this.scrollContainer.getBoundingClientRect();
      // Scroll so the item is near the top (with some padding)
      const scrollOffset = dividerCoords.top - containerRect.top - 100;
      this.scrollContainer.scrollTop += scrollOffset;
    }
    
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
          <h3 class="navigator-title">Vragen</h3>
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
                  <span class="item-label">${item.index === 0 ? 'Inleiding' : `Vraag ${item.index}`}</span>
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
