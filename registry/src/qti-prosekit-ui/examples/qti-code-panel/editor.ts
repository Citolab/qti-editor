/**
 * QTI Code Panel Editor Example
 *
 * This file demonstrates how to integrate the QtiCodePanel
 * component with a ProseKit editor.
 */

import '../../ui/qti-code-panel/index.js';

import { html, LitElement, type PropertyDeclaration, type PropertyValues } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { union, type Editor } from 'prosekit/core';
import { createEditor } from 'prosekit/core';
import { defineBasicExtension } from 'prosekit/basic';

import { defineExtension } from './extension.js';

export class LitEditorCodePanel extends LitElement {
  static override properties = {
    editor: {
      state: true,
      attribute: false,
    } satisfies PropertyDeclaration<Editor>,
  };

  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;

  constructor() {
    super();

    // Combine the basic editor extension with the code panel extension
    const extension = union(defineBasicExtension(), defineExtension());
    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();
  }

  override createRenderRoot() {
    return this;
  }

  override disconnectedCallback() {
    this.editor.unmount();
    super.disconnectedCallback();
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    this.editor.mount(this.editorRef.value);
  }

  override render() {
    return html`
      <div class="flex gap-4">
        <div class="flex-1">
          <div class="prose" ${ref(this.editorRef)}></div>
        </div>
        <div class="w-96">
          <qti-code-panel></qti-code-panel>
        </div>
      </div>
    `;
  }
}

export function registerLitEditorCodePanel() {
  if (!customElements.get('lit-editor-code-panel')) {
    customElements.define('lit-editor-code-panel', LitEditorCodePanel);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-editor-code-panel': LitEditorCodePanel;
  }
}
