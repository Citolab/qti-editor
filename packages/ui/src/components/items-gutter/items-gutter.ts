import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { Editor } from 'prosekit/core';

/**
 * QTI Items Gutter
 * 
 * Displays item numbers in a left gutter/sidebar. Shows a sticky current-item
 * indicator at the top that updates based on scroll position.
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

    .current-item-marker {
      position: sticky;
      top: 0.5rem;
      width: 100%;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: hsl(221 83% 30%);
      background: hsl(221 83% 95%);
      cursor: pointer;
      padding: 0.25rem 0;
      border-radius: 0.25rem;
      margin: 0 0.25rem;
      width: calc(100% - 0.5rem);
    }

    .current-item-marker::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: hsl(var(--primary, 221 83% 53%));
      border-radius: 0.25rem 0 0 0.25rem;
    }

    .current-item-marker:hover {
      background: hsl(221 83% 90%);
    }
  `;

  @property({ attribute: false })
  editor: Editor | null = null;

  @state()
  private currentItemIndex = 0;

  private scrollContainer: HTMLElement | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.editor) {
      // Defer setup until editor is mounted
      setTimeout(() => {
        this.setupEditorListeners();
        this.updateDividerIndices();
        this.updateCurrentItemFromScroll();
      }, 100);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEditorListeners();
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('editor') && this.editor) {
      this.removeEditorListeners();
      // Defer setup until editor is mounted
      setTimeout(() => {
        this.setupEditorListeners();
        this.updateDividerIndices();
        this.updateCurrentItemFromScroll();
      }, 100);
    }
  }

  private getView() {
    if (!this.editor) return null;
    try {
      return (this.editor as any).view;
    } catch {
      return null;
    }
  }

  private setupEditorListeners() {
    const view = this.getView();
    if (!view?.dom) return;

    // Find scroll container
    let scrollElement: HTMLElement | null = null;
    const viewDomStyle = window.getComputedStyle(view.dom);
    
    if (viewDomStyle.overflowY === 'auto' || viewDomStyle.overflowY === 'scroll') {
      scrollElement = view.dom;
    } else {
      let element = view.dom.parentElement;
      let depth = 0;
      while (element && depth < 10) {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollElement = element;
          break;
        }
        element = element.parentElement;
        depth++;
      }
    }
    this.scrollContainer = scrollElement;

    view.dom.addEventListener('qti:editor:change', this.handleEditorChange);
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll);
    }
    document.addEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private removeEditorListeners() {
    const view = this.getView();
    if (view?.dom) {
      view.dom.removeEventListener('qti:editor:change', this.handleEditorChange);
    }
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }
    document.removeEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private handleEditorReady = () => {
    this.setupEditorListeners();
    setTimeout(() => {
      this.updateDividerIndices();
      this.updateCurrentItemFromScroll();
    }, 100);
  };

  private handleEditorChange = () => {
    this.updateDividerIndices();
    this.updateCurrentItemFromScroll();
  };

  private handleScroll = () => {
    this.updateCurrentItemFromScroll();
  };

  private updateDividerIndices() {
    const view = this.getView();
    if (!view?.dom) return;

    const dividers = view.dom.querySelectorAll('qti-item-divider');
    dividers.forEach((divider: Element, index: number) => {
      const itemIndex = index + 1;
      divider.setAttribute('data-item-index', String(itemIndex));
      divider.id = `qti-item-${itemIndex}`;
      // CSS anchor positioning (for browsers that support it)
      (divider as HTMLElement).style.setProperty('anchor-name', `--qti-item-${itemIndex}`);
    });
  }

  private updateCurrentItemFromScroll() {
    if (!this.scrollContainer) return;

    const view = this.getView();
    if (!view?.dom) return;

    const containerRect = this.scrollContainer.getBoundingClientRect();
    const targetY = containerRect.top + (containerRect.height / 3);

    // Start with item 0 (before first divider)
    let currentIndex = 0;

    // Check each divider - if it's scrolled past the threshold, we're in the next item
    const dividers = view.dom.querySelectorAll('qti-item-divider');
    dividers.forEach((divider: Element, index: number) => {
      const rect = divider.getBoundingClientRect();
      if (rect.top <= targetY) {
        currentIndex = index + 1;
      }
    });

    this.currentItemIndex = currentIndex;
  }

  private navigateToItem(itemIndex: number) {
    const view = this.getView();
    if (!view?.dom) return;

    if (itemIndex === 0) {
      // Scroll to start of editor
      view.dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Use native scrollIntoView on the divider element
      const divider = view.dom.querySelector(`#qti-item-${itemIndex}`);
      if (divider) {
        divider.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    // Delay focus to not interrupt smooth scroll
    setTimeout(() => view.focus(), 300);
  }

  override render() {
    return html`
      <div 
        class="current-item-marker" 
        @click=${() => this.navigateToItem(this.currentItemIndex)} 
        title="Item ${this.currentItemIndex + 1}"
      >
        ${this.currentItemIndex + 1}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-items-gutter': QtiItemsGutter;
  }
}
