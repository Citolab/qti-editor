import '@qti-editor/ui/components/blocks/interaction-insert-menu';
import '@qti-editor/ui/components/blocks/convert-menu';
import '@qti-editor/ui/components/editor/ui/toolbar';
import '@qti-editor/ui/components/editor/ui/slash-menu';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Editor } from 'prosekit/core';

@customElement('qti-editor-chrome')
export class QtiEditorChrome extends LitElement {
  @property({ attribute: false })
  declare public editor: Editor | null;

  @property({ attribute: false })
  declare public uploader: unknown;

  constructor() {
    super();
    this.editor = null;
    this.uploader = null;
  }

  override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <div class="flex flex-wrap items-center gap-2 border-b border-solid border-gray-200 bg-white px-3 py-2">
        <qti-interaction-insert-menu .editor=${this.editor}></qti-interaction-insert-menu>
        <qti-convert-menu .editor=${this.editor}></qti-convert-menu>
      </div>
      <lit-editor-toolbar .editor=${this.editor} .uploader=${this.uploader}></lit-editor-toolbar>
      <lit-editor-slash-menu .editor=${this.editor} style="display: contents;"></lit-editor-slash-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-editor-chrome': QtiEditorChrome;
  }
}
