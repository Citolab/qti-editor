/**
 * Attributes Panel Editor Example
 *
 * This file demonstrates how to integrate the QtiAttributesPanel
 * component with a ProseKit editor.
 */

import '@qti-editor/qti-editor-kit/ui/attributes-panel';

import { html, LitElement, type PropertyDeclaration, type PropertyValues } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { union, type Editor } from 'prosekit/core';
import { createEditor } from 'prosekit/core';
import { defineBasicExtension } from 'prosekit/basic';

import { defineExtension } from './extension.js';

export class LitEditorAttributesPanel extends LitElement {
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

    // Combine the basic editor extension with the attributes extension
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
      <div class="editor-with-attributes-panel">
        <div class="editor-viewport">
          <div ${ref(this.editorRef)} class="editor-content"></div>
        </div>
        <qti-attributes-panel .editorView=${this.editor.view}></qti-attributes-panel>
      </div>
    `;
  }
}

export function registerLitEditorAttributesPanel() {
  if (customElements.get('lit-editor-example-attributes-panel')) return;
  customElements.define('lit-editor-example-attributes-panel', LitEditorAttributesPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-editor-example-attributes-panel': LitEditorAttributesPanel;
  }
}
