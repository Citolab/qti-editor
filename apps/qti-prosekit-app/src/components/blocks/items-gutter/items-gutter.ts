import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Editor } from 'prosekit/core';

/**
 * QTI Items Gutter
 * 
 * Displays a left gutter/sidebar area. Sets data-item-index attributes
 * on qti-item-divider elements so they show their item number badges.
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
  `;

  @property({ attribute: false })
  editor: Editor | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.editor) {
      // Defer setup until editor is mounted
      setTimeout(() => {
        this.setupEditorListeners();
        this.updateDividerIndices();
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

    view.dom.addEventListener('qti:editor:change', this.handleEditorChange);
    document.addEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private removeEditorListeners() {
    const view = this.getView();
    if (view?.dom) {
      view.dom.removeEventListener('qti:editor:change', this.handleEditorChange);
    }
    document.removeEventListener('qti:editor:ready', this.handleEditorReady as EventListener);
  }

  private handleEditorReady = () => {
    this.setupEditorListeners();
    setTimeout(() => {
      this.updateDividerIndices();
    }, 100);
  };

  private handleEditorChange = () => {
    this.updateDividerIndices();
  };

  private updateDividerIndices() {
    const view = this.getView();
    if (!view?.dom) return;

    const dividers = view.dom.querySelectorAll('qti-item-divider');
    dividers.forEach((divider: Element, index: number) => {
      // itemIndex is 0-based, but dividers mark the start of item 2, 3, etc.
      // So divider at index 0 starts item 2 (itemIndex = 1)
      const itemIndex = index + 1;
      // Setting the attribute triggers Lit's reactive property update
      divider.setAttribute('data-item-index', String(itemIndex));
    });
  }

  override render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-items-gutter': QtiItemsGutter;
  }
}
