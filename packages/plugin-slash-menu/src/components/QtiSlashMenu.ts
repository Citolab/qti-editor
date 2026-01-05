/**
 * QTI Slash Menu Component
 *
 * Minimal Lit web component that renders slash menu items from the plugin system.
 * Uses custom events to communicate with the qti-slash-menu plugin.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { type SlashMenuItem, clearSlashState } from '../index';

interface SlashMenuState {
  isOpen: boolean;
  query: string;
  items: SlashMenuItem[];
  selectedIndex: number;
  position?: { top: number; left: number; bottom: number; right: number };
}

@customElement('qti-slash-menu')
export class QtiSlashMenu extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1000;
    }

    .slash-menu-overlay {
      position: fixed;
      pointer-events: auto;
    }

    .slash-menu-container {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      min-width: 280px;
      max-width: 320px;
      max-height: 400px;
      overflow: hidden;
    }

    .slash-menu-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slash-menu-title {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }

    .slash-menu-query {
      color: #6b7280;
      font-size: 13px;
      font-family: monospace;
    }

    .slash-menu-items {
      max-height: 320px;
      overflow-y: auto;
    }

    .slash-menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s;
    }

    .slash-menu-item:last-child {
      border-bottom: none;
    }

    .slash-menu-item:hover,
    .slash-menu-item.selected {
      background: #f3f4f6;
    }

    .slash-menu-item.selected {
      background: #3b82f6;
      color: white;
    }

    .item-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .item-icon {
      font-size: 18px;
      width: 20px;
      text-align: center;
    }

    .item-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-label {
      font-weight: 500;
      font-size: 14px;
    }

    .item-description {
      font-size: 12px;
      color: #6b7280;
    }

    .slash-menu-item.selected .item-description {
      color: rgba(255, 255, 255, 0.8);
    }

    .item-kbd {
      background: #e5e7eb;
      color: #374151;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 500;
    }

    .slash-menu-item.selected .item-kbd {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
  `;

  @state()
  declare private menuState: SlashMenuState;

  constructor() {
    super();
    this.menuState = {
      isOpen: false,
      query: '',
      items: [],
      selectedIndex: 0,
    };
  }

  override connectedCallback() {
    super.connectedCallback();

    // Listen for plugin events
    document.addEventListener('prosekit:slash-menu:open', this.handleMenuOpen);
    document.addEventListener('prosekit:slash-menu:close', this.handleMenuClose);
    document.addEventListener('prosekit:slash-menu:update', this.handleMenuUpdate);

    // Listen for keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener('prosekit:slash-menu:open', this.handleMenuOpen);
    document.removeEventListener('prosekit:slash-menu:close', this.handleMenuClose);
    document.removeEventListener('prosekit:slash-menu:update', this.handleMenuUpdate);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleMenuOpen = (event: Event) => {
    console.log('📥 QtiSlashMenu received open event', event);
    const { query, items, position } = (event as CustomEvent).detail as {
      query: string;
      items: SlashMenuItem[];
      position: { top: number; left: number; bottom: number; right: number };
    };
    console.log('📋 Menu items:', items.length, 'Position:', position);
    this.menuState = {
      isOpen: true,
      query,
      items,
      selectedIndex: 0,
      position,
    };
    console.log('✅ Menu state updated, isOpen:', this.menuState.isOpen);
  };

  private handleMenuClose = () => {
    this.menuState = {
      isOpen: false,
      query: '',
      items: [],
      selectedIndex: 0,
    };
  };

  private handleMenuUpdate = (event: Event) => {
    const { query, items } = (event as CustomEvent).detail as {
      query: string;
      items: SlashMenuItem[];
    };
    this.menuState = {
      ...this.menuState,
      query,
      items,
      selectedIndex: 0, // Reset selection on update
    };
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.menuState.isOpen) return;

    const { items, selectedIndex } = this.menuState;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.menuState = {
          ...this.menuState,
          selectedIndex: (selectedIndex + 1) % items.length,
        };
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.menuState = {
          ...this.menuState,
          selectedIndex: selectedIndex > 0 ? selectedIndex - 1 : items.length - 1,
        };
        break;
      case 'Enter':
        event.preventDefault();
        this.selectItem(items[selectedIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        clearSlashState();
        break;
    }
  };

  private selectItem(item: SlashMenuItem) {
    // Dispatch custom event with the selected item command
    // The editor component will handle the actual command execution
    const event = new CustomEvent('prosekit:slash-menu:select', {
      detail: { item },
    });
    document.dispatchEvent(event);

    // Clear state and close menu
    clearSlashState();
  }

  private renderMenuItem(item: SlashMenuItem, index: number) {
    const isSelected = index === this.menuState.selectedIndex;

    return html`
      <div
        class="slash-menu-item ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectItem(item)}
        @mouseenter=${() => (this.menuState = { ...this.menuState, selectedIndex: index })}
      >
        <div class="item-content">
          <span class="item-icon">${item.icon || '📄'}</span>
          <div class="item-text">
            <span class="item-label">${item.label}</span>
            ${item.description
    ? html`<span class="item-description">${item.description}</span>`
    : ''}
          </div>
        </div>
        ${item.keywords.some((k) => ['#', '##', '-', '1.'].includes(k))
    ? html`<kbd class="item-kbd"
              >${item.keywords.find((k) => ['#', '##', '-', '1.'].includes(k))}</kbd
            >`
    : ''}
      </div>
    `;
  }

  override render() {
    if (!this.menuState.isOpen || this.menuState.items.length === 0) {
      return html``;
    }

    // Calculate menu position - place below and to the left of cursor
    const position = this.menuState.position;
    const style = position
      ? `top: ${position.bottom + 4}px; left: ${position.left}px;`
      : 'top: 50%; left: 50%; transform: translate(-50%, -50%);';

    return html`
      <div class="slash-menu-overlay" style=${style}>
        <div class="slash-menu-container">
          <div class="slash-menu-header">
            <span class="slash-menu-title">Insert</span>
            <span class="slash-menu-query">${this.menuState.query}</span>
          </div>
          <div class="slash-menu-items">
            ${this.menuState.items.map((item, index) => this.renderMenuItem(item, index))}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-slash-menu': QtiSlashMenu;
  }
}
